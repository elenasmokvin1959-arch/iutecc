use serde_json::{json, Value};
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const DATA_FILE: &str = "data.json";
const UPLOAD_DIR: &str = "uploads";

fn main() -> std::io::Result<()> {
    let port = env::var("PORT").unwrap_or_else(|_| "10000".to_string());
    let listener = TcpListener::bind(format!("0.0.0.0:{port}"))?;
    println!("iutecc listening on port {port}");

    for stream in listener.incoming().flatten() {
        handle_client(stream);
    }

    Ok(())
}

fn handle_client(mut stream: TcpStream) {
    let Some(request) = read_request(&mut stream) else {
        return;
    };

    let first_line = request.lines().next().unwrap_or("");
    let mut parts = first_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/");
    let body = request.split("\r\n\r\n").nth(1).unwrap_or("");

    match (method, path.split('?').next().unwrap_or(path)) {
        ("GET", "/api/data") => send_json(&mut stream, "200 OK", load_data()),
        ("POST", "/api/data") => save_site_data(&mut stream, &request, body),
        ("POST", "/api/upload") => save_upload(&mut stream, &request, body),
        ("POST", "/api/review") => save_review(&mut stream, body),
        _ => serve_file(&mut stream, path),
    }
}

fn read_request(stream: &mut TcpStream) -> Option<String> {
    let mut buffer = Vec::new();
    let mut temp = [0; 8192];
    let mut content_length = 0usize;

    loop {
        let size = stream.read(&mut temp).ok()?;
        if size == 0 {
            break;
        }
        buffer.extend_from_slice(&temp[..size]);
        let text = String::from_utf8_lossy(&buffer);

        if let Some(header_end) = text.find("\r\n\r\n") {
            if content_length == 0 {
                content_length = parse_content_length(&text[..header_end]);
            }
            if buffer.len() >= header_end + 4 + content_length {
                break;
            }
        }
    }

    String::from_utf8(buffer).ok()
}

fn parse_content_length(headers: &str) -> usize {
    headers
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse().ok())
                .flatten()
        })
        .unwrap_or(0)
}

fn save_site_data(stream: &mut TcpStream, request: &str, body: &str) {
    if !check_admin_password(request) {
        send_json(stream, "401 Unauthorized", json!({"ok": false, "error": "bad password"}));
        return;
    }

    match serde_json::from_str::<Value>(body) {
        Ok(mut value) => {
            convert_data_images(&mut value);
            match write_data(&value) {
                Ok(_) => send_json(stream, "200 OK", json!({"ok": true})),
                Err(_) => send_json(stream, "500 Internal Server Error", json!({"ok": false})),
            }
        }
        Err(_) => send_json(stream, "400 Bad Request", json!({"ok": false, "error": "bad json"})),
    }
}

fn save_upload(stream: &mut TcpStream, request: &str, body: &str) {
    if !check_admin_password(request) {
        send_json(stream, "401 Unauthorized", json!({"ok": false, "error": "bad password"}));
        return;
    }

    let Ok(value) = serde_json::from_str::<Value>(body) else {
        send_json(stream, "400 Bad Request", json!({"ok": false, "error": "bad json"}));
        return;
    };

    let Some(image) = value.get("image").and_then(Value::as_str) else {
        send_json(stream, "400 Bad Request", json!({"ok": false, "error": "no image"}));
        return;
    };

    match save_data_url(image) {
        Some(url) => send_json(stream, "200 OK", json!({"ok": true, "url": url})),
        None => send_json(stream, "400 Bad Request", json!({"ok": false, "error": "bad image"})),
    }
}

fn save_review(stream: &mut TcpStream, body: &str) {
    let Ok(review) = serde_json::from_str::<Value>(body) else {
        send_json(stream, "400 Bad Request", json!({"ok": false, "error": "bad json"}));
        return;
    };

    let mut data = load_data();
    if !data.is_object() {
        data = json!({});
    }

    let root = data.as_object_mut().unwrap();
    let reviews = root.entry("reviews").or_insert_with(|| json!([]));
    if !reviews.is_array() {
        *reviews = json!([]);
    }
    reviews.as_array_mut().unwrap().insert(0, review);

    match write_data(&data) {
        Ok(_) => send_json(stream, "200 OK", json!({"ok": true})),
        Err(_) => send_json(stream, "500 Internal Server Error", json!({"ok": false})),
    }
}

fn check_admin_password(request: &str) -> bool {
    let expected = env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "iutecc228".to_string());
    let provided = request.lines().find_map(|line| {
        let Some((name, value)) = line.split_once(':') else {
            return None;
        };
        if name.eq_ignore_ascii_case("x-admin-password") {
            Some(value.trim().to_string())
        } else {
            None
        }
    });

    let Some(provided) = provided else {
        return false;
    };

    if provided == expected {
        return true;
    }

    load_data()
        .get("password")
        .and_then(Value::as_str)
        .map(|stored| stored == provided)
        .unwrap_or(false)
}

fn load_data() -> Value {
    let mut value = fs::read_to_string(DATA_FILE)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_else(|| json!({}));

    if convert_data_images(&mut value) {
        let _ = write_data(&value);
    }

    value
}

fn write_data(value: &Value) -> std::io::Result<()> {
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))?;
    fs::write(DATA_FILE, bytes)
}

fn convert_data_images(value: &mut Value) -> bool {
    match value {
        Value::String(text) if text.starts_with("data:image/") => {
            if let Some(url) = save_data_url(text) {
                *text = url;
                return true;
            }
            false
        }
        Value::Array(items) => {
            let mut changed = false;
            for item in items {
                changed |= convert_data_images(item);
            }
            changed
        }
        Value::Object(map) => {
            let mut changed = false;
            for item in map.values_mut() {
                changed |= convert_data_images(item);
            }
            changed
        }
        _ => false,
    }
}

fn save_data_url(data_url: &str) -> Option<String> {
    let (meta, encoded) = data_url.split_once(',')?;
    if !meta.starts_with("data:image/") {
        return None;
    }

    let ext = meta
        .trim_start_matches("data:image/")
        .split(';')
        .next()
        .unwrap_or("jpg")
        .to_ascii_lowercase();
    let ext = match ext.as_str() {
        "jpeg" | "jpg" => "jpg",
        "png" => "png",
        "webp" => "webp",
        "gif" => "gif",
        _ => "jpg",
    };

    let bytes = decode_base64(encoded)?;
    fs::create_dir_all(UPLOAD_DIR).ok()?;
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_millis();
    let path = format!("{UPLOAD_DIR}/iute-{stamp}.{ext}");
    fs::write(&path, bytes).ok()?;
    Some(format!("/{path}"))
}

fn decode_base64(input: &str) -> Option<Vec<u8>> {
    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    let mut buffer = 0u32;
    let mut bits = 0u8;

    for byte in input.bytes() {
        let value = match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            b'=' => break,
            b'\r' | b'\n' | b' ' => continue,
            _ => return None,
        } as u32;

        buffer = (buffer << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push(((buffer >> bits) & 0xff) as u8);
        }
    }

    Some(output)
}

fn serve_file(stream: &mut TcpStream, path: &str) {
    let file_path = resolve_path(path);
    let (status, body, content_type) = match fs::read(&file_path) {
        Ok(body) => ("200 OK", body, content_type(&file_path)),
        Err(_) => (
            "404 Not Found",
            b"Not found".to_vec(),
            "text/plain; charset=utf-8",
        ),
    };
    send_bytes(stream, status, body, content_type, "public, max-age=60");
}

fn send_json(stream: &mut TcpStream, status: &str, value: Value) {
    let body = serde_json::to_vec(&value).unwrap_or_else(|_| b"{}".to_vec());
    send_bytes(stream, status, body, "application/json; charset=utf-8", "no-store");
}

fn send_bytes(stream: &mut TcpStream, status: &str, body: Vec<u8>, content_type: &str, cache: &str) {
    let headers = format!(
        "HTTP/1.1 {status}\r\nContent-Length: {}\r\nContent-Type: {content_type}\r\nCache-Control: {cache}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(&body);
}

fn resolve_path(raw_path: &str) -> PathBuf {
    let clean = raw_path.split('?').next().unwrap_or("/");
    let clean = clean.trim_start_matches('/');

    if clean.is_empty() || clean.contains("..") || clean.contains('\\') {
        return PathBuf::from("index.html");
    }

    PathBuf::from(clean)
}

fn content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|ext| ext.to_str()).unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" => "application/javascript; charset=utf-8",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    }
}
