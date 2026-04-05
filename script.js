let lastStatus = "Normal";
let dataLog = [];
let chartPH, chartSuhu, chartTurbidity, chartDO;

// ================= LOGIN SYSTEM =================
function checkLogin() {
  // Mengecek apakah di browser sudah tersimpan status login
  if (localStorage.getItem("login") === "true") {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    startSystem(); // Menjalankan sistem grafik dan update data
  } else {
    document.getElementById("loginBox").style.display = "flex";
    document.getElementById("dashboard").style.display = "none";
  }
}

function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMessage");
  const loginContent = document.querySelector(".login-content");

  if (user === "tim 8" && pass === "12345") {
    // FIX: Simpan status login ke localStorage agar saat refresh tidak logout
    localStorage.setItem("login", "true");

    errorMsg.style.display = "none";
    
    // Tampilkan loading box
    document.getElementById("loadingBox").style.display = "flex";
    document.getElementById("loginBox").style.opacity = "0"; // Smooth transition

    setTimeout(() => {
      document.getElementById("loadingBox").style.display = "none";
      document.getElementById("loginBox").style.display = "none";
      document.getElementById("dashboard").style.display = "block";
      
      // Jalankan sistem monitoring
      startSystem();
    }, 1500);

  } else {
    // Menampilkan pesan error
    const errorMsg = document.getElementById("errorMessage");
    errorMsg.style.display = "block"; 
    
    // Efek getar pada kotak login
    loginContent.classList.add("shake");
    setTimeout(() => loginContent.classList.remove("shake"), 400);

    document.getElementById("password").value = "";
    document.getElementById("password").focus();
}
}

// Menghilangkan pesan error saat user mulai mengetik ulang
document.getElementById("password").addEventListener("input", function() {
  document.getElementById("errorMessage").style.display = "none";
});
document.getElementById("username").addEventListener("input", function() {
  document.getElementById("errorMessage").style.display = "none";
});

function logout() {
  localStorage.removeItem("login");
  location.reload();
}

// ================= SYSTEM START =================
function startSystem() {
  // Pastikan grafik belum ada sebelum membuat yang baru (mencegah double chart)
  if (chartPH) return; 

  chartPH = createChart('pH', '#4ade80', 'chartPH');
  chartSuhu = createChart('Suhu', '#fb923c', 'chartSuhu');
  chartTurbidity = createChart('Turbidity', '#60a5fa', 'chartTurbidity');
  chartDO = createChart('DO', '#a78bfa', 'chartDO');

  // Langsung update data pertama kali tanpa menunggu 5 detik
  updateData(); 
  
  // Interval update setiap 5 detik
  setInterval(updateData, 5000);
}

// ================= CHART LOGIC =================
function createChart(label, color, canvasId) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: label,
        data: [],
        borderColor: color,
        backgroundColor: color + '22', // Tambah transparansi sedikit
        borderWidth: 2,
        tension: 0.4, // Membuat garis melengkung halus
        pointRadius: 3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false } // Sembunyikan legend agar rapi
      }
    }
  });
}

function updateChart(chart, value) {
  let time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(value);

  if (chart.data.labels.length > 7) { // Batasi 7 titik saja agar tidak penuh di HP
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();
}

// ================= DATA LOGIC =================
function updateData() {
  let ph = Number((6.5 + Math.random() * 1.5).toFixed(2));
  let suhu = Number((27 + Math.random() * 4).toFixed(2));
  let turbidity = Number((2 + Math.random() * 10).toFixed(2));
  let doValue = Number((5 + Math.random() * 3).toFixed(2));

  // Update angka di dashboard
  document.getElementById("ph").innerText = ph;
  document.getElementById("suhu").innerText = suhu;
  document.getElementById("turbidity").innerText = turbidity;
  document.getElementById("do").innerText = doValue;

  // Update grafik
  updateChart(chartPH, ph);
  updateChart(chartSuhu, suhu);
  updateChart(chartTurbidity, turbidity);
  updateChart(chartDO, doValue);

  // Simpan ke log untuk export CSV
  dataLog.push({
    waktu: new Date().toLocaleString(),
    ph, suhu, turbidity, doValue
  });

  // Logika Status
  let status = "Normal";
  let color = "#16a34a"; // Green

  if (ph < 6 || ph > 9 || turbidity > 15 || doValue < 4) {
    status = "Tercemar";
    color = "#ef4444"; // Red
  }

  let statusBox = document.getElementById("status");
  statusBox.innerText = "Status: " + status;
  statusBox.style.background = color;

  // Kirim Telegram jika status berubah jadi tercemar
  if (status === "Tercemar" && lastStatus !== "Tercemar") {
    kirimTelegram(`⚠️ PERINGATAN! Air Tercemar!\npH: ${ph}\nTurbidity: ${turbidity} NTU\nDO: ${doValue} mg/L`);
  }

  lastStatus = status;
}

// ================= EXPORT & TELEGRAM =================
function exportCSV() {
  if (dataLog.length === 0) return alert("Belum ada data untuk diunduh!");
  
  let csv = "Waktu,pH,Suhu,Turbidity,DO\n";
  dataLog.forEach(row => {
    csv += `${row.waktu},${row.ph},${row.suhu},${row.turbidity},${row.doValue}\n`;
  });

  let blob = new Blob([csv], { type: 'text/csv' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = `Monitoring_IPAL_${new Date().getTime()}.csv`;
  a.click();
}

function kirimTelegram(pesan) {
  let token = "YOUR_BOT_TOKEN";
  let chat_id = "YOUR_CHAT_ID";
  let url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${encodeURIComponent(pesan)}`;
  fetch(url).catch(err => console.log("Telegram Error:", err));
}

// Inisialisasi awal
checkLogin();