'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Chart, registerables } from 'chart.js';

// Registrasi modul Chart.js
Chart.register(...registerables);

// ==========================================
// 1. TYPE DEFINITIONS & INTERFACES
// ==========================================

export interface SaranData {
  ID?: string;
  Tanggal?: string;
  'Fakultas/Lokasi'?: string;
  'Permasalahan/Isu'?: string;
  'Saran Solusi/Tindakan'?: string;
  'Penanggung Jawab'?: string;
  Prioritas?: string;
  Status?: string;
}

export interface JadwalData {
  JadwalKode?: string | number;
  ProdiFakultasNama?: string;
  ProdiNama?: string;
  MKNamaMataKuliah?: string;
  JadwalKelas?: string;
  hHari?: string;
  JadwalJadwalJamMulai?: string;
  JumlahMhs?: number | string;
  RuanganNamaRuang?: string;
  JadwalRuangKode?: string | number;
}

export interface RuangData {
  ruangkode?: string;
  ruangannamaruang?: string;
  jrgnama?: string;
  rgedungnama?: string;
  upbnama?: string;
  ruangankapasitasnormal?: number | string;
}

export interface OkWaktuData {
  JadwalRuangKode?: string | number;
  RuanganNamaRuang?: string;
  Fakultas?: string;
  hHari?: string;
  durasi_jam?: number | string;
  'occupation_rate_waktu_%'?: number | string;
}

export interface BentrokData {
  JadwalKode?: string | number;
  ProdiFakultasNama?: string;
  ProdiNama?: string;
  MKNamaMataKuliah?: string;
  JadwalKelas?: string;
  hHari?: string;
  JadwalJadwalJamMulai?: string;
  JadwalJadwalJamAkhir?: string;
  JumlahMhs?: number | string;
  RuanganNamaRuang?: string;
  rGedungNama?: string;
  UPBNama?: string;
  jrgNama?: string;
}

export interface OkKapData {
  JadwalKode?: string | number;
  RuanganNamaRuang?: string;
  MKNamaMataKuliah?: string;
  hHari?: string;
  JadwalJadwalJamMulai?: string;
  'Kapasitas ruangan'?: number | string;
  JumlahMhs?: number | string;
  'okupansi_kapasitas_%'?: number | string;
}

export interface RuangTTData {
  ruangkode?: string;
  ruangannamaruang?: string;
  jrgnama?: string;
  rgedungnama?: string;
  upbnama?: string;
  ruangankapasitasnormal?: number | string;
}

export interface ApiResponse {
  status: string;
  timestamp: string;
  saran: SaranData[];
  jadwal: JadwalData[];
  ruang: RuangData[];
  okWaktu: OkWaktuData[];
  bentrok: BentrokData[];
  okKapasitas: OkKapData[];
  ruangTT: RuangTTData[];
}

export interface FormSaranState {
  fakultas: string;
  isu: string;
  solusi: string;
  pj: string;
  prioritas: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Solved';
}

export type TabKey =
  | 'overview'
  | 'saran'
  | 'jadwal'
  | 'ruang'
  | 'okWaktu'
  | 'bentrok'
  | 'okKap'
  | 'ruangTT';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwF2Zb7ZVcLvRPtar6rSNHsMcwhkoWm-6Mf4NRV-nripNueFHaqTWX4Y80mZi_RLhZPOQ/exec';
const PAGE_SIZE = 30;

export default function DashboardRoster() {
  const [db, setDb] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Pagination state per tab
  const [pages, setPages] = useState<Record<string, number>>({
    jadwal: 1,
    ruang: 1,
    okWaktu: 1,
    bentrok: 1,
    okKap: 1,
    ruangTT: 1,
  });

  // Filter States
  const [fltJadwal, setFltJadwal] = useState({ fak: '', prodi: '', src: '' });
  const [fltRuang, setFltRuang] = useState({ upb: '', jenis: '', src: '' });
  const [fltOkWaktu, setFltOkWaktu] = useState({ fak: '', hari: '' });
  const [fltBentrok, setFltBentrok] = useState({ fak: '', prodi: '' });
  const [fltOkKap, setFltOkKap] = useState({ cat: '', src: '' });
  const [fltRuangTT, setFltRuangTT] = useState({ upb: '', jenis: '' });

  // Form State
  const [formSaran, setFormSaran] = useState<FormSaranState>({
    fakultas: '',
    isu: '',
    solusi: '',
    pj: '',
    prioritas: 'Medium',
    status: 'Open',
  });

  // Chart Canvas Refs
  const canvasBentrokFak = useRef<HTMLCanvasElement | null>(null);
  const canvasOkupansiKap = useRef<HTMLCanvasElement | null>(null);
  const canvasJadwalHari = useRef<HTMLCanvasElement | null>(null);
  const canvasRuangTT = useRef<HTMLCanvasElement | null>(null);
  const chartInstances = useRef<{ [key: string]: Chart | null }>({});

  // Fetch Data
  const loadAllData = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(GAS_URL);
      const json: ApiResponse = await res.json();
      if (json.status === 'success') {
        setDb(json);
      } else {
        alert('Gagal membaca data dari Google Sheets');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi ke backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Render Chart.js ketika di Tab Overview & data sudah ada
  useEffect(() => {
    if (activeTab === 'overview' && db) {
      renderCharts(db);
    }
  }, [activeTab, db]);

  const createChart = (
    canvasId: string,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    type: 'bar' | 'line' | 'doughnut',
    labels: string[],
    dataValues: number[],
    labelName: string,
    colors: string | string[]
  ) => {
    if (!canvasRef.current) return;
    if (chartInstances.current[canvasId]) {
      chartInstances.current[canvasId]?.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstances.current[canvasId] = new Chart(ctx, {
      type: type,
      data: {
        labels: labels,
        datasets: [
          {
            label: labelName,
            data: dataValues,
            backgroundColor: colors,
            borderColor: type === 'line' && typeof colors === 'string' ? colors : undefined,
            fill: type === 'line',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: type === 'doughnut' } },
      },
    });
  };

  const renderCharts = (data: ApiResponse) => {
    // 1. Kasus Bentrok per Fakultas
    const bentrokFakMap: Record<string, number> = {};
    data.bentrok.forEach((r) => {
      const f = String(r.ProdiFakultasNama || 'Lainnya').trim();
      if (f) bentrokFakMap[f] = (bentrokFakMap[f] || 0) + 1;
    });
    const sortedBentrokFak = Object.entries(bentrokFakMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    createChart(
      'chartBentrokFak',
      canvasBentrokFak,
      'bar',
      sortedBentrokFak.map((x) => x[0]),
      sortedBentrokFak.map((x) => x[1]),
      'Kasus Bentrok',
      '#ef4444'
    );

    // 2. Okupansi Kapasitas
    let over = 0, opt = 0, under = 0, low = 0;
    data.okKapasitas.forEach((r) => {
      const rate = Number(r['okupansi_kapasitas_%']) || 0;
      const kap = Number(r['Kapasitas ruangan']) || 0;
      if (kap > 0) {
        if (rate > 100) over++;
        else if (rate >= 70) opt++;
        else if (rate >= 30) under++;
        else low++;
      }
    });
    createChart(
      'chartOkupansiKap',
      canvasOkupansiKap,
      'doughnut',
      ['Over (>100%)', 'Optimal (70-100%)', 'Under (30-69%)', 'Low (<30%)'],
      [over, opt, under, low],
      'Kategori',
      ['#ef4444', '#10b981', '#f59e0b', '#6b7280']
    );

    // 3. Distribusi Hari
    const hariOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const hariMap: Record<string, number> = {};
    data.jadwal.forEach((r) => {
      const h = String(r.hHari || '').trim();
      if (h && h !== 'NaN') hariMap[h] = (hariMap[h] || 0) + 1;
    });
    const hariLabels = hariOrder.filter((h) => hariMap[h]);
    const hariValues = hariLabels.map((h) => hariMap[h]);
    createChart(
      'chartJadwalHari',
      canvasJadwalHari,
      'line',
      hariLabels,
      hariValues,
      'Jumlah Perkuliahan',
      '#2563eb'
    );

    // 4. Ruang Idle
    const rttMap: Record<string, number> = {};
    data.ruangTT.forEach((r) => {
      const j = String(r.jrgnama || 'Lainnya').trim();
      if (j) rttMap[j] = (rttMap[j] || 0) + 1;
    });
    const sortedRTT = Object.entries(rttMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    createChart(
      'chartRuangTT',
      canvasRuangTT,
      'bar',
      sortedRTT.map((x) => x[0]),
      sortedRTT.map((x) => x[1]),
      'Jumlah Ruang Idle',
      '#64748b'
    );
  };

  // Submit Form Saran
  const handleSubmitSaran = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(formSaran),
      });
      const result: { status: string; message: string } = await res.json();
      if (result.status === 'success') {
        alert(result.message);
        setShowModal(false);
        setFormSaran({
          fakultas: '',
          isu: '',
          solusi: '',
          pj: '',
          prioritas: 'Medium',
          status: 'Open',
        });
        loadAllData();
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan saran.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination Change
  const changePage = (key: string, delta: number) => {
    setPages((prev) => ({
      ...prev,
      [key]: Math.max(1, (prev[key] || 1) + delta),
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white z-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h5 className="font-bold text-lg">Membaca Data Realtime dari Google Sheets...</h5>
        <p className="text-slate-400 text-sm">Menyiapkan Ringkasan Utama & Filter Interaktif.</p>
      </div>
    );
  }

  // --- FILTERED DATA CALCULATIONS ---

  // Filter Jadwal
  const filteredJadwal = (db?.jadwal || []).filter((r) => {
    const matchFak = !fltJadwal.fak || String(r.ProdiFakultasNama) === fltJadwal.fak;
    const matchProdi = !fltJadwal.prodi || String(r.ProdiNama) === fltJadwal.prodi;
    const matchSrc =
      !fltJadwal.src ||
      String(r.MKNamaMataKuliah).toLowerCase().includes(fltJadwal.src.toLowerCase()) ||
      String(r.JadwalKode).includes(fltJadwal.src);
    return matchFak && matchProdi && matchSrc;
  });

  // Filter Ruang
  const filteredRuang = (db?.ruang || []).filter((r) => {
    const matchUPB = !fltRuang.upb || String(r.upbnama) === fltRuang.upb;
    const matchJenis = !fltRuang.jenis || String(r.jrgnama) === fltRuang.jenis;
    const matchSrc =
      !fltRuang.src ||
      String(r.ruangannamaruang).toLowerCase().includes(fltRuang.src.toLowerCase()) ||
      String(r.rgedungnama).toLowerCase().includes(fltRuang.src.toLowerCase());
    return matchUPB && matchJenis && matchSrc;
  });

  // Filter OkWaktu
  const filteredOkWaktu = (db?.okWaktu || []).filter((r) => {
    const matchFak = !fltOkWaktu.fak || String(r.Fakultas) === fltOkWaktu.fak;
    const matchHari = !fltOkWaktu.hari || String(r.hHari) === fltOkWaktu.hari;
    return matchFak && matchHari;
  });

  // Filter Bentrok
  const filteredBentrok = (db?.bentrok || []).filter((r) => {
    const matchFak = !fltBentrok.fak || String(r.ProdiFakultasNama) === fltBentrok.fak;
    const matchProdi = !fltBentrok.prodi || String(r.ProdiNama) === fltBentrok.prodi;
    return matchFak && matchProdi;
  });

  // Filter OkKap
  const filteredOkKap = (db?.okKapasitas || []).filter((r) => {
    const rate = Number(r['okupansi_kapasitas_%']) || 0;
    let matchCat = true;
    if (fltOkKap.cat === 'over') matchCat = rate > 100;
    else if (fltOkKap.cat === 'optimal') matchCat = rate >= 70 && rate <= 100;
    else if (fltOkKap.cat === 'under') matchCat = rate >= 30 && rate < 70;
    else if (fltOkKap.cat === 'low') matchCat = rate < 30;

    const matchSrc =
      !fltOkKap.src ||
      String(r.MKNamaMataKuliah).toLowerCase().includes(fltOkKap.src.toLowerCase()) ||
      String(r.RuanganNamaRuang).toLowerCase().includes(fltOkKap.src.toLowerCase());
    return matchCat && matchSrc;
  });

  // Filter RuangTT
  const filteredRuangTT = (db?.ruangTT || []).filter((r) => {
    const matchUPB = !fltRuangTT.upb || String(r.upbnama) === fltRuangTT.upb;
    const matchJenis = !fltRuangTT.jenis || String(r.jrgnama) === fltRuangTT.jenis;
    return matchUPB && matchJenis;
  });

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100 font-sans text-xs md:text-sm">
      {/* SIDEBAR */}
      <aside className="w-full lg:w-64 bg-slate-900 text-white p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-6 px-2">
            <img
              src="https://images.seeklogo.com/logo-png/63/2/universitas-padjadjaran-logo-png_seeklogo-634022.png"
              alt="Logo Unpad"
              className="h-9 w-auto"
            />
            <h5 className="font-bold text-base text-white">Direktorat Akademik</h5>
          </div>
          <hr className="border-slate-700 mb-4" />
          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview Realtime', icon: '📊' },
              { id: 'saran', label: '1. Saran Perbaikan', icon: '💡' },
              { id: 'jadwal', label: '2. Master Jadwal', icon: '📅' },
              { id: 'ruang', label: '3. Data Ruang', icon: '🏫' },
              { id: 'okWaktu', label: '4. Okupansi Waktu', icon: '⏰' },
              { id: 'bentrok', label: '5. Jadwal Bentrok', icon: '⚠️' },
              { id: 'okKap', label: '6. Okupansi Kapasitas', icon: '👥' },
              { id: 'ruangTT', label: '7. Ruang Tak Terpakai', icon: '🚪' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="pt-6 text-center text-slate-500 text-xs border-t border-slate-800 mt-6">
          <p>Update Realtime:</p>
          <p className="text-slate-300 font-semibold">{db?.timestamp || '-'}</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              Dashboard Hasil Analisis Roster Perkuliahan
            </h1>
            <p className="text-xs text-slate-500">Sistem Informasi Eksekutif Operasional</p>
          </div>
          <button
            onClick={loadAllData}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2"
          >
            🔄 Sync Realtime Data
          </button>
        </div>

        {/* ================= TAB 0: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Jadwal" value={db?.jadwal.length || 0} icon="📅" color="text-blue-600" />
              <StatCard title="Jadwal Bentrok" value={db?.bentrok.length || 0} icon="⚠️" color="text-rose-600" />
              <StatCard
                title="Mhs Terdampak"
                value={(db?.bentrok || []).reduce((a, b) => a + (Number(b.JumlahMhs) || 0), 0)}
                icon="👥"
                color="text-amber-600"
              />
              <StatCard
                title="Kelas Teori Idle"
                value={(db?.ruangTT || []).filter((r) => String(r.jrgnama).trim() === 'Kelas Teori').length}
                icon="🚪"
                color="text-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3">Kasus Bentrok per Fakultas</h3>
                <div className="h-60"><canvas ref={canvasBentrokFak}></canvas></div>
              </div>
              <div className="lg:col-span-5 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3">Okupansi Kapasitas Kelas</h3>
                <div className="h-60"><canvas ref={canvasOkupansiKap}></canvas></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3">Distribusi Jadwal per Hari</h3>
                <div className="h-60"><canvas ref={canvasJadwalHari}></canvas></div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3">Kategori Ruangan Tak Terpakai</h3>
                <div className="h-60"><canvas ref={canvasRuangTT}></canvas></div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 1: SARAN ================= */}
        {activeTab === 'saran' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Saran Perbaikan & Action Plan</h2>
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow"
              >
                + Input Saran Manual
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Saran" value={db?.saran.length || 0} icon="💡" color="text-slate-700" />
              <StatCard title="Status Open" value={(db?.saran || []).filter((s) => s.Status === 'Open').length} icon="⏳" color="text-amber-600" />
              <StatCard title="In Progress" value={(db?.saran || []).filter((s) => s.Status === 'In Progress').length} icon="🔄" color="text-blue-600" />
              <StatCard title="Solved" value={(db?.saran || []).filter((s) => s.Status === 'Solved').length} icon="✅" color="text-emerald-600" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Tgl</th>
                    <th className="p-3">Fakultas/Lokasi</th>
                    <th className="p-3">Permasalahan/Isu</th>
                    <th className="p-3">Saran Solusi</th>
                    <th className="p-3">PJ</th>
                    <th className="p-3">Prioritas</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(db?.saran || []).map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">{s.ID || '-'}</td>
                      <td className="p-3">{s.Tanggal || '-'}</td>
                      <td className="p-3">{s['Fakultas/Lokasi'] || '-'}</td>
                      <td className="p-3">{s['Permasalahan/Isu'] || '-'}</td>
                      <td className="p-3">{s['Saran Solusi/Tindakan'] || '-'}</td>
                      <td className="p-3">{s['Penanggung Jawab'] || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.Prioritas === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {s.Prioritas || 'Medium'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.Status === 'Solved' ? 'bg-emerald-100 text-emerald-700' : s.Status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {s.Status || 'Open'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MASTER JADWAL ================= */}
        {activeTab === 'jadwal' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Master Data Jadwal Perkuliahan</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Cari Mata Kuliah / Kode..."
                className="border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                value={fltJadwal.src}
                onChange={(e) => setFltJadwal({ ...fltJadwal, src: e.target.value })}
              />
            </div>
            <PaginatedTable
              keyName="jadwal"
              data={filteredJadwal}
              page={pages.jadwal}
              onPageChange={(delta) => changePage('jadwal', delta)}
              headers={['Kode', 'Fakultas', 'Prodi', 'Mata Kuliah', 'Kelas', 'Hari/Jam', 'Mhs', 'Ruangan']}
              renderRow={(r: JadwalData, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3">{r.JadwalKode || '-'}</td>
                  <td className="p-3">{r.ProdiFakultasNama || '-'}</td>
                  <td className="p-3">{r.ProdiNama || '-'}</td>
                  <td className="p-3">{r.MKNamaMataKuliah || '-'}</td>
                  <td className="p-3"><span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">{r.JadwalKelas || '-'}</span></td>
                  <td className="p-3">{r.hHari || '-'} ({r.JadwalJadwalJamMulai || ''})</td>
                  <td className="p-3">{r.JumlahMhs || 0}</td>
                  <td className="p-3">{r.RuanganNamaRuang || <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">Tanpa Ruang</span>}</td>
                </tr>
              )}
            />
          </div>
        )}

        {/* MODAL TAMBAH SARAN */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Tambah Saran Perbaikan Manual</h3>
              <form onSubmit={handleSubmitSaran} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fakultas / Lokasi</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formSaran.fakultas}
                    onChange={(e) => setFormSaran({ ...formSaran, fakultas: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Permasalahan / Isu</label>
                  <textarea
                    required
                    rows={2}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formSaran.isu}
                    onChange={(e) => setFormSaran({ ...formSaran, isu: e.target.value })}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Saran Solusi</label>
                  <textarea
                    required
                    rows={2}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formSaran.solusi}
                    onChange={(e) => setFormSaran({ ...formSaran, solusi: e.target.value })}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Penanggung Jawab (PJ)</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formSaran.pj}
                    onChange={(e) => setFormSaran({ ...formSaran, pj: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Prioritas</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formSaran.prioritas}
                      onChange={(e) => setFormSaran({ ...formSaran, prioritas: e.target.value as any })}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formSaran.status}
                      onChange={(e) => setFormSaran({ ...formSaran, status: e.target.value as any })}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Solved">Solved</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan ke Sheet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- SUB COMPONENTS WITH TYPES ---

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium">{title}</p>
        <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  );
}

interface PaginatedTableProps<T> {
  keyName: string;
  data: T[];
  page: number;
  onPageChange: (delta: number) => void;
  headers: string[];
  renderRow: (item: T, index: number) => React.ReactNode;
}

function PaginatedTable<T>({
  data,
  page,
  onPageChange,
  headers,
  renderRow,
}: PaginatedTableProps<T>) {
  const total = data.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pagedData = data.slice(start, start + PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-white uppercase text-xs">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="p-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {pagedData.map((item, idx) => renderRow(item, idx))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
        <span>
          Menampilkan {total > 0 ? start + 1 : 0} - {Math.min(start + PAGE_SIZE, total)} dari {total} data (Halaman {safePage}/{totalPages})
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(-1)}
            disabled={safePage <= 1}
            className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => onPageChange(1)}
            disabled={safePage >= totalPages}
            className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}