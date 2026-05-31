document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    const filesGrid = document.getElementById('files-grid');
    const emptyState = document.getElementById('empty-state');
    const refreshBtn = document.getElementById('refresh-btn');

    // Load initial files
    fetchFiles();

    // Event Listeners for Drop Zone
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUpload(e.target.files);
        }
    });

    refreshBtn.addEventListener('click', fetchFiles);

    // Upload Logic
    function handleUpload(files) {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        progressText.textContent = `Uploading ${files.length} file(s)...`;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressPercentage.textContent = percentComplete + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                progressText.textContent = 'Upload complete!';
                progressBar.style.background = 'var(--success)';
                
                setTimeout(() => {
                    progressContainer.classList.add('hidden');
                    progressBar.style.background = 'var(--accent)'; // reset
                    fetchFiles();
                }, 2000);
            } else {
                progressText.textContent = 'Upload failed!';
                progressBar.style.background = 'var(--danger)';
                setTimeout(() => {
                    progressContainer.classList.add('hidden');
                    progressBar.style.background = 'var(--accent)';
                }, 3000);
            }
            // Reset input
            fileInput.value = '';
        };

        xhr.onerror = () => {
            progressText.textContent = 'Upload failed (Network Error)';
            progressBar.style.background = 'var(--danger)';
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                progressBar.style.background = 'var(--accent)';
            }, 3000);
        };

        xhr.send(formData);
    }

    // Fetch Files Logic
    async function fetchFiles() {
        try {
            refreshBtn.style.transform = 'rotate(180deg)';
            setTimeout(() => refreshBtn.style.transform = 'rotate(0deg)', 300);

            const response = await fetch('/api/files');
            const files = await response.json();
            renderFiles(files);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    }

    // Format file size
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Determine icon based on file extension
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        const icons = {
            'pdf': 'document-text-outline',
            'doc': 'document-outline',
            'docx': 'document-outline',
            'txt': 'document-outline',
            
            'jpg': 'image-outline',
            'jpeg': 'image-outline',
            'png': 'image-outline',
            'gif': 'image-outline',
            'svg': 'image-outline',
            'webp': 'image-outline',
            
            'mp4': 'videocam-outline',
            'mov': 'videocam-outline',
            'avi': 'videocam-outline',
            'mkv': 'videocam-outline',
            
            'mp3': 'musical-notes-outline',
            'wav': 'musical-notes-outline',
            
            'zip': 'archive-outline',
            'rar': 'archive-outline',
            '7z': 'archive-outline',
        };
        
        return icons[ext] || 'document-outline';
    }

    // Render Files
    function renderFiles(files) {
        filesGrid.innerHTML = '';
        
        if (files.length === 0) {
            emptyState.classList.remove('hidden');
            filesGrid.style.display = 'none';
            return;
        }
        
        emptyState.classList.add('hidden');
        filesGrid.style.display = 'grid';
        
        files.forEach(file => {
            // Create proper date string
            const date = new Date(file.createdAt);
            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            
            // Generate clean filename (remove timestamp prefix if it exists)
            let displayName = file.name;
            const match = displayName.match(/^\d{10}-/);
            if (match) {
                displayName = displayName.substring(match[0].length);
            }

            const card = document.createElement('div');
            card.className = 'file-card';
            
            card.innerHTML = `
                <a href="${file.url}" target="_blank" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 1rem;">
                    <div class="file-icon-wrapper">
                        <ion-icon name="${getFileIcon(displayName)}"></ion-icon>
                    </div>
                    <div class="file-info">
                        <span class="file-name" title="${displayName}">${displayName}</span>
                        <div class="file-meta">
                            <span>${formatSize(file.size)}</span>
                            <span>${dateStr}</span>
                        </div>
                    </div>
                </a>
                <div class="file-actions">
                    <a href="${file.url}" download="${displayName}" class="action-btn btn-save">
                        <ion-icon name="download-outline"></ion-icon> Save
                    </a>
                    <button class="action-btn btn-delete" onclick="deleteFile('${file.name}')">
                        <ion-icon name="trash-outline"></ion-icon> Delete
                    </button>
                </div>
            `;
            
            filesGrid.appendChild(card);
        });
    }
});

// Expose delete function globally so inline onclick works
window.deleteFile = async function(filename) {
    if (confirm('Are you sure you want to delete this file?')) {
        try {
            const response = await fetch(`/api/files/${filename}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                // Trigger click on refresh button to reload files
                document.getElementById('refresh-btn').click();
            } else {
                alert('Failed to delete file.');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file.');
        }
    }
};
