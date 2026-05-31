import os
import time
import socket
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import urllib.parse

# Setup folders
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
PUBLIC_FOLDER = os.path.join(BASE_DIR, 'public')

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(PUBLIC_FOLDER):
    os.makedirs(PUBLIC_FOLDER)

# Initialize Flask App
# Serve static files from 'public' directory at the root URL
app = Flask(__name__, static_folder=PUBLIC_FOLDER, static_url_path='')
CORS(app)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Set max upload size to 10GB for big videos
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 * 1024

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    uploaded_files = []
    for file in files:
        if file:
            filename = secure_filename(file.filename)
            # Add timestamp to prevent overwrites
            filename = f"{int(time.time())}-{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            uploaded_files.append(filename)
            
    return jsonify({'message': 'Files uploaded successfully', 'files': uploaded_files})

@app.route('/api/files', methods=['GET'])
def list_files():
    try:
        files = os.listdir(app.config['UPLOAD_FOLDER'])
        file_list = []
        for file in files:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file)
            if os.path.isfile(file_path):
                stats = os.stat(file_path)
                file_list.append({
                    'name': file,
                    'size': stats.st_size,
                    'createdAt': stats.st_mtime * 1000, # JS expects milliseconds
                    'url': f"/api/download/{urllib.parse.quote(file)}"
                })
        
        # Sort by newest first
        file_list.sort(key=lambda x: x['createdAt'], reverse=True)
        return jsonify(file_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'message': 'File deleted successfully'})
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    port = 3000
    ip = get_local_ip()
    print(f"==================================================")
    print(f"Server is running!")
    print(f"Access on this computer: http://localhost:{port}")
    print(f"Access on other devices: http://{ip}:{port}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
