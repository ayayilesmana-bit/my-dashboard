'use client';

import { useState, useEffect, FormEvent } from 'react';

// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwF2Zb7ZVcLvRPtar6rSNHsMcwhkoWm-6Mf4NRV-nripNueFHaqTWX4Y80mZi_RLhZPOQ/exec';

// --- TYPE DEFINITIONS ---
export interface GenericRowData {
  _rowNum?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface DashboardData {
  status: string;
  timestamp: string;
  saran: GenericRowData[];
  jadwal: GenericRowData[];
  ruang: GenericRowData[];
  okWaktu: GenericRowData[];
  bentrok: GenericRowData[];
  okKapasitas: GenericRowData[];
  ruangTT: GenericRowData[];
}

export type TabKey = 'jadwal' | 'bentrok' | 'ruangTT' | 'okWaktu' | 'okKapasitas' | 'saran';

export interface FormSaranState {
  fakultas: string;
  isu: string;
  solusi: string;
  pj: string;
  prioritas: 'Low' | 'Medium' | 'High';
  status: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabKey>('jadwal');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [formSaran, setFormSaran] = useState<FormSaranState>({
    fakultas: '',
    isu: '',
    solusi: '',
    pj: '',
    prioritas: 'Medium',
    status: 'Open',
  });

  // Fetch Data dari Google Apps Script
  const fetchData = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(GAS_URL);
      const json: DashboardData = await res.json();
      if (json.status === 'success') {
        setData(json);
      } else {
        alert('Gagal mengambil data dari server');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi ke Google Apps Script');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Form Submit dengan Type FormEvent
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
        fetchData(); // Refresh Data
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim saran');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-semibold text-slate-700">Memuat Data Dashboard Realtime...</p>
      </div>
    );
  }

  // Menentukan daftar tab navigasi dengan type safety
  const tabsConfig: { id: TabKey; label: string }[] = [
    { id: 'jadwal', label: 'Jadwal Kuliah' },
    { id: 'bentrok', label: `Jadwal Bentrok (${data?.bentrok?.length || 0})` },
    { id: 'ruangTT', label: 'Ruangan Tidak Terpakai' },
    { id: 'okWaktu', label: 'Okupansi Waktu' },
    { id: 'okKapasitas', label: 'Okupansi Kapasitas' },
    { id: 'saran', label: 'Saran Perbaikan' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Realtime Perkuliahan & Ruangan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Terakhir diperbarui: {data?.timestamp || '-'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition"
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition"
          >
            + Tambah Saran
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Jadwal" value={data?.jadwal?.length || 0} icon="📅" color="bg-blue-50 border-blue-200" />
        <StatCard title="Total Ruangan" value={data?.ruang?.length || 0} icon="🏫" color="bg-emerald-50 border-emerald-200" />
        <StatCard title="Jadwal Bentrok" value={data?.bentrok?.length || 0} icon="⚠️" color="bg-rose-50 border-rose-200 text-rose-700" />
        <StatCard title="Ruang Tak Terpakai" value={data?.ruangTT?.length || 0} icon="🚪" color="bg-amber-50 border-amber-200" />
        <StatCard title="Saran Perbaikan" value={data?.saran?.length || 0} icon="💡" color="bg-indigo-50 border-indigo-200" />
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-300 mb-6 overflow-x-auto">
        {tabsConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Table View */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
        {data && data[activeTab] && data[activeTab].length > 0 ? (
          <DataTable items={data[activeTab]} />
        ) : (
          <div className="p-8 text-center text-slate-400">Tidak ada data untuk ditampilkan.</div>
        )}
      </div>

      {/* Modal Form Tambah Saran */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Tambah Saran Perbaikan</h2>
            <form onSubmit={handleSubmitSaran} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Fakultas / Lokasi</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formSaran.fakultas}
                  onChange={(e) => setFormSaran({ ...formSaran, fakultas: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Permasalahan / Isu</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formSaran.isu}
                  onChange={(e) => setFormSaran({ ...formSaran, isu: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Saran Solusi</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formSaran.solusi}
                  onChange={(e) => setFormSaran({ ...formSaran, solusi: e.target.value })}
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formSaran.pj}
                    onChange={(e) => setFormSaran({ ...formSaran, pj: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Prioritas</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formSaran.prioritas}
                    onChange={(e) =>
                      setFormSaran({
                        ...formSaran,
                        prioritas: e.target.value as FormSaranState['prioritas'],
                      })
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS WITH PROPS TYPES ---

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className={`p-4 rounded-xl border ${color} shadow-sm flex items-center justify-between`}>
      <div>
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  );
}

interface DataTableProps {
  items: GenericRowData[];
}

function DataTable({ items }: DataTableProps) {
  if (!items || items.length === 0) return null;
  // Memfilter header agar '_rowNum' internal dari Apps Script tidak ditampilkan
  const headers = Object.keys(items[0]).filter((key) => key !== '_rowNum');

  return (
    <div className="overflow-x-auto max-h-[500px]">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-700 uppercase text-xs sticky top-0 border-b border-slate-200">
          <tr>
            <th className="p-3">#</th>
            {headers.map((h) => (
              <th key={h} className="p-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="p-3 text-slate-400 text-xs">{idx + 1}</td>
              {headers.map((h) => (
                <td key={h} className="p-3 whitespace-nowrap">
                  {row[h] !== null && row[h] !== undefined ? String(row[h]) : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}