/**
 * Panduan setiap tab, untuk pengguna yang baru pertama kali guna sistem.
 *
 * Setiap entri ada dua bahagian: tujuan halaman (kenapa ia wujud) dan langkah
 * kerja (apa yang perlu dibuat). Hanya tab yang benar-benar kelihatan ada di
 * sini — panduan untuk tab tersembunyi hanya akan mengelirukan.
 */

export type Sop = {
  title: string;
  purpose: string;
  steps: string[];
  note?: string;
};

/* ── Affiliate ─────────────────────────────────────────── */

export const AFFILIATE_SOP: Record<string, Sop> = {
  schedule: {
    title: "Pending Schedule",
    purpose:
      "Senarai live yang anda sudah tetapkan tetapi belum siap dilaporkan. " +
      "Di sinilah anda daftar tarikh live dan muat naik keputusan selepas live tamat.",
    steps: [
      "Klik Add Schedule untuk daftar live baharu.",
      "Pilih link profile TikTok, pilih brand, isi tarikh, masa mula dan masa tamat.",
      "Selepas live tamat, ambil screenshot analytics live dari TikTok.",
      "Klik Upload screenshot pada kad live tersebut. Sistem akan baca GMV, viewers, items sold dan tempoh live secara automatik.",
      "Semak nombor yang dibaca. Kalau ada yang tersalah atau kosong, klik Correct dan betulkan sendiri.",
      "Bila keempat-empat nombor lengkap, live itu akan berpindah ke tab Done Schedule.",
    ],
    note:
      "Kalau live masih kekal di sini selepas muat naik, maksudnya ada nombor yang belum lengkap. " +
      "Kotak kuning pada kad akan beritahu nombor mana yang kurang.",
  },

  "done-schedule": {
    title: "Done Schedule",
    purpose:
      "Rekod live yang sudah lengkap dilaporkan. Ini menjadi bukti kerja anda " +
      "dan asas pengiraan komisyen.",
    steps: [
      "Semak semula keputusan setiap live yang sudah siap.",
      "Klik gambar screenshot untuk lihat versi besar.",
    ],
    note:
      "Halaman ini tidak boleh diedit. Live yang sudah dilaporkan adalah rekod rasmi — " +
      "kalau ada kesilapan, maklumkan kepada marketer anda.",
  },

  pending: {
    title: "Pending Post",
    purpose:
      "Video yang disediakan untuk anda tetapi belum dimuat naik ke TikTok. " +
      "Setiap kad ada video, gambar cover dan teks siap pakai.",
    steps: [
      "Klik video untuk tonton dahulu.",
      "Klik butang biru muda untuk muat turun video ke telefon.",
      "Klik butang biru untuk lihat dan simpan gambar cover.",
      "Klik Copy pada Main Text, Sub Text dan Caption untuk salin teks.",
      "Muat naik video ke TikTok menggunakan teks dan cover tersebut.",
      "Balik ke sini, klik butang ungu dan tampal link TikTok video itu, kemudian simpan.",
      "Video akan berpindah ke tab Done Post.",
    ],
  },

  done: {
    title: "Done Post",
    purpose: "Video yang sudah anda muat naik ke TikTok dan sudah ada linknya.",
    steps: [
      "Semak semula senarai video yang sudah siap dipost.",
      "Klik link TikTok untuk buka video tersebut.",
    ],
  },

  brand: {
    title: "Brand",
    purpose:
      "Brand yang anda pegang, disusun mengikut brand. Setiap brand menunjukkan " +
      "link profile TikTok mana yang menjalankannya dan group WhatsApp brand itu.",
    steps: [
      "Semak brand yang ditetapkan kepada anda.",
      "Klik Link Group WhatsApp untuk masuk group brand tersebut.",
    ],
    note:
      "Anda tidak boleh tambah brand sendiri. Marketer yang tetapkan brand pada setiap " +
      "link profile anda. Kalau brand tak muncul, minta marketer tetapkan dahulu.",
  },

  sample: {
    title: "Sample",
    purpose:
      "Tempat mohon sample produk untuk live atau video anda, dan ikut " +
      "perkembangan penghantarannya.",
    steps: [
      "Klik Request Sample.",
      "Pilih brand, semak nama, nombor telefon dan alamat penghantaran.",
      "Isi Nota kalau ada permintaan khusus, kemudian hantar.",
      "Status Pending bermakna admin belum proses lagi.",
      "Status Processing bermakna admin sudah pilih produk untuk dihantar.",
      "Status Shipped bermakna bungkusan sudah dihantar — nombor tracking akan dipaparkan.",
      "Bila bungkusan sampai, klik butang Received.",
    ],
    note:
      "Anda tidak boleh pilih produk sendiri. Admin yang tentukan produk mana " +
      "yang sesuai dihantar untuk brand yang anda mohon.",
  },
};

/* ── Marketer ──────────────────────────────────────────── */

export const MARKETER_SOP: Record<string, Sop> = {
  dashboard: {
    title: "Dashboard",
    purpose:
      "Ringkasan prestasi semua affiliate di bawah anda untuk julat tarikh yang dipilih.",
    steps: [
      "Tetapkan julat tarikh di bahagian atas.",
      "Semak jumlah live, jumlah GMV dan prestasi keseluruhan.",
      "Guna maklumat ini untuk kenal pasti affiliate yang perlu dibantu.",
    ],
  },

  brand: {
    title: "Brand",
    purpose:
      "Brand yang anda pegang. Semua tab lain ditapis mengikut brand di sini, " +
      "jadi ia perlu ditetapkan dahulu sebelum apa-apa kerja lain.",
    steps: [
      "Klik Add Brand.",
      "Pilih brand dari senarai syarikat, atau taip nama brand baharu.",
      "Brand baharu yang anda taip akan masuk senarai syarikat juga, supaya marketer lain boleh guna.",
      "Isi Link Group WhatsApp untuk setiap brand, kemudian klik Simpan.",
      "Affiliate akan nampak link group itu di tab Brand mereka.",
    ],
    note:
      "Menukar nama brand akan menukar nama itu untuk semua orang yang pegang brand sama.",
  },

  product: {
    title: "Product",
    purpose:
      "Senarai produk syarikat, dikongsi bersama admin. Anda boleh tolong isi " +
      "bila admin tak sempat — ia satu senarai yang sama untuk semua.",
    steps: [
      "Klik Add Product.",
      "Isi nama produk, pilih brand, isi SKU dan link produk.",
      "Isi Product Info — cara guna, kandungan dan selling point. Affiliate akan baca bahagian ini.",
      "Muat naik gambar produk dan dokumen PDF kalau ada.",
      "Klik Save.",
    ],
    note:
      "Produk milik brand, bukan milik marketer. Semua marketer yang pegang brand " +
      "sama akan nampak produk yang sama.",
  },

  affiliates: {
    title: "List Affiliate",
    purpose:
      "Semua affiliate di bawah anda, link TikTok mereka, brand pada setiap link " +
      "dan kadar komisyen setiap brand.",
    steps: [
      "Klik Add Affiliate untuk daftar affiliate baharu. Mereka terus boleh login dan akan terima butiran login melalui WhatsApp.",
      "Untuk tambah link TikTok, tampal URL profile mereka pada kotak di bawah kad, kemudian klik Add.",
      "Klik dropdown Brand, tandakan brand yang link itu jalankan, kemudian klik Save.",
      "Klik label brand pada link untuk tetapkan komisyen brand tersebut — Percent atau Hour.",
      "Klik butang Komisyen untuk lihat semua kadar bagi link itu sekali pandang.",
    ],
    note:
      "Satu link boleh pegang beberapa brand, dan setiap brand boleh ada kadar berbeza. " +
      "Brand yang sudah ada jadual live tidak boleh dibuang daripada link itu.",
  },

  pending: {
    title: "Pending Affiliate",
    purpose:
      "Live yang sudah dijadualkan tetapi belum lengkap dari sudut anda — iaitu " +
      "belum ada Budget, Spend, Gross Revenue dan ROI.",
    steps: [
      "Klik Add Schedule kalau anda mahu tetapkan jadual bagi pihak affiliate.",
      "Isi Budget Ads pada kad live, kemudian klik Save.",
      "Klik Enter results untuk isi Ad Spend dan Gross Revenue. ROI akan dikira sendiri.",
      "Bila Budget, Spend, Gross dan ROI lengkap, live akan berpindah ke Success Affiliate.",
      "Guna toggle Affiliate can edit kalau anda mahu kunci tarikh dan masa live itu.",
    ],
    note:
      "Live mungkin sudah siap dari sudut affiliate (mereka sudah muat naik screenshot) " +
      "tetapi masih kekal di sini sehingga anda isi angka iklan. Itu memang betul.",
  },

  success: {
    title: "Success Affiliate",
    purpose:
      "Live yang sudah lengkap sepenuhnya — ada keputusan live dan ada angka iklan.",
    steps: [
      "Semak prestasi live yang sudah selesai.",
      "Guna penapis tarikh dan brand untuk lihat tempoh tertentu.",
    ],
    note: "Halaman ini rekod sahaja dan tidak boleh diedit.",
  },

  posting: {
    title: "Posting Affiliate",
    purpose:
      "Berapa banyak video setiap affiliate masih belum post, dan berapa yang sudah siap.",
    steps: [
      "Semak jadual untuk lihat siapa yang tertunggak.",
      "Klik nombor pada lajur Total Pending Post untuk tengok video yang belum dipost.",
      "Klik nombor pada lajur Total Done Post untuk tengok video yang sudah dipost.",
      "Anda boleh tonton dan muat turun video tersebut untuk semakan.",
    ],
    note:
      "Anda tidak boleh isi link TikTok bagi pihak affiliate. Hanya mereka yang " +
      "boleh sahkan video sudah dipost.",
  },

  reporting: {
    title: "Reporting Affiliate",
    purpose:
      "Prestasi dan komisyen setiap affiliate. Ini asas untuk bayaran.",
    steps: [
      "Tetapkan julat tarikh dan brand yang hendak dilihat.",
      "Klik Papar sub profile untuk pecahkan mengikut link dan brand.",
      "Setiap baris menunjukkan jualan, tempoh live, kadar komisyen dan jumlah komisyen.",
      "Klik mana-mana tajuk lajur untuk susun menaik atau menurun.",
    ],
    note:
      "Komisyen Percent dikira daripada jualan brand itu. Komisyen Hour dikira " +
      "daripada tempoh live sebenar sampai ke saat, dan hanya untuk live yang sudah lengkap.",
  },

  "product-gmv": {
    title: "Product GMV",
    purpose:
      "Prestasi setiap kempen produk, diimport terus daripada fail TikTok Ads.",
    steps: [
      "Muat turun fail .xlsx daripada TikTok Ads.",
      "Pilih brand, kemudian muat naik fail tersebut.",
      "Semak jadual selepas import selesai.",
      "Klik mana-mana tajuk lajur untuk susun data.",
    ],
  },

  overall: {
    title: "Overall",
    purpose:
      "Ringkasan prestasi keseluruhan brand mengikut tarikh, daripada screenshot GMV Max.",
    steps: [
      "Ambil dua screenshot daripada TikTok: GMV Overview dan Key metrics.",
      "Pilih brand dan tarikh laporan.",
      "Muat naik kedua-dua screenshot sekali. Sistem akan baca nombornya.",
      "Semak baris yang masuk dalam jadual.",
    ],
    note: "Kedua-dua screenshot wajib. Satu sahaja tidak mencukupi.",
  },

  "pillar-create": {
    title: "Create Pillar",
    purpose:
      "Rangka kerja strategi kandungan. Setiap level ada senarai perkara yang " +
      "perlu difikirkan sebelum menjalankan kempen.",
    steps: [
      "Pilih brand dan tarikh.",
      "Pilih level yang hendak diisi.",
      "Bagi setiap item, isi empat ruangan: Problem, Solution, Planning dan Execution.",
      "Tidak semua item wajib diisi — isi yang berkaitan dengan brand anda sahaja.",
      "Klik tanda soal di sebelah setiap item kalau tidak pasti maksudnya.",
      "Klik Simpan.",
    ],
  },

  "pillar-report": {
    title: "Reporting Pillar",
    purpose:
      "Ringkasan semua pillar yang sudah diisi, supaya anda nampak bahagian mana " +
      "yang masih kosong.",
    steps: [
      "Tetapkan julat tarikh dan brand.",
      "Klik mana-mana level untuk buka isi kandungannya.",
      "Semak level yang masih kosong dan lengkapkan di Create Pillar.",
    ],
  },
};
