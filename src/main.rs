use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};

fn main() -> std::io::Result<()> {
    let port = env::var("PORT").unwrap_or_else(|_| "10000".to_string());
    let listener = TcpListener::bind(format!("0.0.0.0:{port}"))?;
    println!("iutecc listening on port {port}");

    for stream in listener.incoming() {
        if let Ok(stream) = stream {
            handle_client(stream);
        }
    }

    Ok(())
}

fn handle_client(mut stream: TcpStream) {
    let mut buffer = [0; 2048];
    let Ok(size) = stream.read(&mut buffer) else {
        return;
    };

    let request = String::from_utf8_lossy(&buffer[..size]);
    let path = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("/");

    let file_path = resolve_path(path);
    let (status, body, content_type) = match fs::read(&file_path) {
        Ok(body) => ("200 OK", body, content_type(&file_path)),
        Err(_) => (
            "404 Not Found",
            b"Not found".to_vec(),
            "text/plain; charset=utf-8",
        ),
    };

    let headers = format!(
        "HTTP/1.1 {status}\r\nContent-Length: {}\r\nContent-Type: {content_type}\r\nCache-Control: public, max-age=60\r\nConnection: close\r\n\r\n",
        body.len()
    );

    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(&body);
}

fn resolve_path(raw_path: &str) -> PathBuf {
    let clean = raw_path.split('?').next().unwrap_or("/");
    let clean = clean.trim_start_matches('/');

    if clean.is_empty() {
        return PathBuf::from("index.html");
    }

    if clean.contains("..") || clean.contains('\\') {
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
        _ => "application/octet-stream",
    }
}
