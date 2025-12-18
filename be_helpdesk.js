var scriptSet = PropertiesService.getScriptProperties();

// --- KONFIGURASI ---
// Isi data rahasia di sini
var token = ""; // Token Bot Telegram
var sheetID = "14GBSTVukRF7StNtKSpUIuznC24DovIKsT0UdVEMgc_A"; // ID Google Sheet
var sheetName = "DataTiket"; // Ganti nama Sheet di bawah menjadi 'DataTiket'
var webAppURL = "https://script.google.com/macros/s/AKfycbznLkLSowwaLK_xqoCvGure8p1pi2c4p2RWxDpzs4AYJ5WV4b_mA_0eBuUWENmjxdrFgA/exec"; // URL Web App setelah Deploy

// --- REGEX UNTUK MENANGKAP FORMAT TIKET ---
// Pola: Menangkap baris yang diawali kata kunci tertentu (case insensitive)
var regexLapor = /Nama Perusahaan\s*:\s*(.*)\nNama Pelapor\s*:\s*(.*)\nModul\s*:\s*(.*)\nDeskripsi Masalah\s*:\s*([\s\S]*)/i;

// Regex untuk perintah Cek Status (misal: /status TIKET-12345)
var regexStatus = /\/status\s+(.*)/i;

// --- FUNGSI UTAMA ---

function doPost(e) {
  if (e.postData.type == "application/json") {
    var update = JSON.parse(e.postData.contents);
    var bot = new Bot(token, update);
    var bus = new CommandBus();

    // 1. Perintah /start
    bus.on(/\/start/i, function () {
      var msg = "👋 <b>Halo Kak! Selamat datang di PilarBot.</b>\n\n";
      msg += "Saya asisten virtual untuk Support ERP Logistics CV. Pilarmedia Indonesia.\n\n";
      msg += "Ketik <b>/lapor</b> untuk membuat tiket kendala baru.\n";
      msg += "Ketik <b>/bantuan</b> untuk melihat daftar perintah.";
      this.replyToSender(msg);
    });

    // 2. Perintah /lapor (Memberikan format formulir)
    bus.on(/\/lapor/i, function () {
      var msg = "Untuk melaporkan kendala, silakan balas pesan ini (Copy-Paste) dengan format berikut:\n\n";
      msg += "<code>Nama Perusahaan : \n";
      msg += "Nama Pelapor : \n";
      msg += "Modul : \n";
      msg += "Deskripsi Masalah : </code>\n\n";
      msg += "⚠️ <i>Pastikan mengisi semua data agar tim kami bisa segera membantu ya, Kak!</i>";
      this.replyToSender(msg);
    });

    // 3. Perintah /bantuan
    bus.on(/\/bantuan/i, function () {
        var msg = "🛠 <b>Pusat Bantuan PilarBot</b>\n\n";
        msg += "🔹 <b>/lapor</b> - Mendapatkan format pelaporan bug/error.\n";
        msg += "🔹 <b>/status [NomorTiket]</b> - Cek status tiket (Contoh: /status TKT-1001).\n";
        this.replyToSender(msg);
    });

    // 4. Perintah Cek Status (/status NOMORTIKET)
    bus.on(regexStatus, function (nomorTiket) {
        var statusMsg = cekStatusTiket(nomorTiket.trim());
        this.replyToSender(statusMsg);
    });

    // 5. Menangani Input Data Tiket (Jika format cocok dengan regexLapor)
    bus.on(regexLapor, function (perusahaan, pelapor, modul, deskripsi) {
        // Buat ID Tiket Unik
        var ticketID = "TKT-" + Math.floor(Math.random() * 9000 + 1000); 
        var tanggal = new Date();
        
        // Simpan ke Google Sheet
        var dataToSave = [
            tanggal,                // Kolom A: Waktu Input
            ticketID,               // Kolom B: ID Tiket
            update.message.from.id, // Kolom C: ID Telegram User
            perusahaan.trim(),      // Kolom D: Nama Perusahaan
            pelapor.trim(),         // Kolom E: Nama Pelapor
            modul.trim(),           // Kolom F: Modul
            deskripsi.trim(),       // Kolom G: Deskripsi
            "OPEN"                  // Kolom H: Status Awal
        ];
        
        simpanKeSheet(dataToSave);

        // Balas ke user
        var reply = "✅ <b>Laporan Diterima!</b>\n\n";
        reply += "Terima kasih Kak, laporan kendala ERP Anda sudah masuk ke sistem kami.\n";
        reply += "🆔 <b>Nomor Tiket:</b> " + ticketID + "\n";
        reply += "Status: <b>OPEN</b>\n\n";
        reply += "Tim teknis kami akan segera melakukan pengecekan. Kakak bisa cek status berkala dengan mengetik:\n";
        reply += "<code>/status " + ticketID + "</code>";
        
        this.replyToSender(reply);
    });

    bot.register(bus);

    if (update) {
      bot.process();
    }
  }
}

// --- FUNGSI PENDUKUNG ---

function simpanKeSheet(data) {
  var sheet = SpreadsheetApp.openById(sheetID).getSheetByName(sheetName);
  sheet.appendRow(data);
}

function cekStatusTiket(ticketID) {
  var sheet = SpreadsheetApp.openById(sheetID).getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  
  // Loop mencari Ticket ID di Kolom B (Index 1)
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == ticketID) {
      // Jika ketemu, ambil status di Kolom H (Index 7)
      var status = data[i][7]; 
      var modul = data[i][5];
      return "🔍 <b>Status Tiket: " + ticketID + "</b>\n\nModul: " + modul + "\nStatus Saat Ini: <b>" + status + "</b> 👨‍💻";
    }
  }
  return "❌ Maaf Kak, Nomor Tiket <b>" + ticketID + "</b> tidak ditemukan.";
}

function setWebhook() {
  var bot = new Bot(token, {});
  var result = bot.request('setWebhook', { url: webAppURL });
  Logger.log(result);
}

// --- CORE BOT & COMMAND BUS (Sama seperti sebelumnya, disederhanakan) ---

function Bot(token, update) {
  this.token = token;
  this.update = update;
}

Bot.prototype.register = function (bus) { this.bus = bus; }

Bot.prototype.process = function () {
  if (this.update.message && this.update.message.text) {
     this.bus.handle(this);
  }
}

Bot.prototype.request = function (method, data) {
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify(data)
  };
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + this.token + '/' + method, options);
  if (response.getResponseCode() == 200) {
    return JSON.parse(response.getContentText());
  }
  return false;
}

Bot.prototype.replyToSender = function (text) {
  return this.request('sendMessage', {
    'chat_id': this.update.message.chat.id,
    'parse_mode': 'HTML',
    'reply_to_message_id': this.update.message.message_id,
    'text': text
  });
}

function CommandBus() { this.commands = []; }

CommandBus.prototype.on = function (regexp, callback) {
  this.commands.push({'regexp': regexp, 'callback': callback});
}

CommandBus.prototype.handle = function (bot) {
  var text = bot.update.message.text;
  for (var i in this.commands) {
    var cmd = this.commands[i];
    var tokens = cmd.regexp.exec(text);
    if (tokens != null) {
      return cmd.callback.apply(bot, tokens.splice(1));
    }
  }
  // Default response jika tidak ada command yang cocok
  // Tidak perlu error message keras, cukup diam atau arahkan ke help
  return bot.replyToSender("🤔 Maaf Kak, format tidak dikenali. Ketik /bantuan ya.");
}
