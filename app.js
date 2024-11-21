// Database initialization
const DB_NAME = 'birthCertificatesDB';
const DB_VERSION = 1;
let db;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('certificates')) {
        db.createObjectStore('certificates', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// Navigation
document.querySelectorAll('.nav-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(button.dataset.tab).classList.add('active');
  });
});

// Form handling
const birthCertificateForm = document.getElementById('birthCertificateForm');
birthCertificateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(birthCertificateForm);
  const certificateData = {
    type: 'manual',
    dateCreation: new Date().toISOString(),
    ...Object.fromEntries(formData)
  };

  try {
    await saveCertificate(certificateData);
    showCertificatePreview(certificateData);
    birthCertificateForm.reset();
  } catch (error) {
    alert('Erreur lors de l\'enregistrement: ' + error);
  }
});

// File upload handling
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewZone = document.getElementById('previewZone');

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', handleFiles);
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
  handleFiles({ target: { files: e.dataTransfer.files } });
});

function handleFiles(e) {
  const files = Array.from(e.target.files);
  
  files.forEach(file => {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          await saveCertificate({
            type: 'scan',
            dateCreation: new Date().toISOString(),
            fileName: file.name,
            fileData: reader.result
          });
          
          updatePreviewZone(reader.result, file.name);
        } catch (error) {
          alert('Erreur lors de l\'enregistrement: ' + error);
        }
      };
      
      reader.readAsDataURL(file);
    }
  });
}

function updatePreviewZone(dataUrl, fileName) {
  const preview = document.createElement('div');
  preview.className = 'preview-item';
  
  if (dataUrl.startsWith('data:image')) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = fileName;
    preview.appendChild(img);
  } else {
    const icon = document.createElement('div');
    icon.className = 'pdf-icon';
    icon.textContent = 'PDF';
    preview.appendChild(icon);
  }
  
  const name = document.createElement('p');
  name.textContent = fileName;
  preview.appendChild(name);
  
  previewZone.appendChild(preview);
}

// Certificate list handling
async function loadCertificates() {
  try {
    const certificates = await getAllCertificates();
    const tableBody = document.getElementById('certificatesTableBody');
    tableBody.innerHTML = '';
    
    certificates.forEach(cert => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${cert.type === 'manual' ? cert.numero : '-'}</td>
        <td>${cert.type === 'manual' ? `${cert.nom} ${cert.prenom}` : cert.fileName}</td>
        <td>${cert.type === 'manual' ? new Date(cert.dateNaissance).toLocaleDateString() : '-'}</td>
        <td>${cert.type === 'manual' ? 'Manuel' : 'Numérisé'}</td>
        <td>${new Date(cert.dateCreation).toLocaleDateString()}</td>
        <td>
          <button onclick="viewCertificate(${cert.id})" class="btn-secondary">Voir</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading certificates:', error);
  }
}

// Database operations
async function saveCertificate(certificate) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['certificates'], 'readwrite');
    const store = transaction.objectStore('certificates');
    const request = store.add(certificate);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllCertificates() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['certificates'], 'readonly');
    const store = transaction.objectStore('certificates');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Modal handling
const modal = document.getElementById('certificatePreview');
const closeBtn = document.querySelector('.close');
const printBtn = document.getElementById('printCertificate');

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

printBtn.addEventListener('click', () => {
  window.print();
});

// Initialize
initDB().then(() => {
  loadCertificates();
}).catch(error => {
  console.error('Error initializing database:', error);
});