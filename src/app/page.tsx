import Link from 'next/link'
import { MODULES } from '@/lib/utils'
import { ArrowRight, Zap, Cpu, BookOpen, Users, Trophy, ChevronRight, Code, Play, Video, FileText, Loader2, Sparkles, MousePointer, Target } from 'lucide-react'

/** pseudo-random deterministik (0..1) — pengganti Math.random() agar render tetap murni */
function seeded(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                SEA Laboratory Coding Practice
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1 bg-gray-900/60 p-1.5 rounded-full border border-gray-800/80">
              <Link href="/" className="px-5 py-2 rounded-full bg-primary text-white text-sm font-medium shadow-sm transition-all">Home</Link>
              <Link href="/learn" className="px-5 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800/60 text-sm font-medium transition-all">Learning</Link>
              <Link href="#assistant" className="px-5 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800/60 text-sm font-medium transition-all">Assistant</Link>
              <Link href="#contact" className="px-5 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800/60 text-sm font-medium transition-all">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/learn" className="px-6 py-2.5 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-full hover:opacity-90 transition-all font-medium text-sm shadow-md shadow-primary/20 flex items-center gap-2">
                Mulai Belajar <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 overflow-hidden bg-[#0d1117]">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0d1117] to-[#161b22]" />
          
                {/* Large radial gradients for depth */}
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#0066CC]/15 via-transparent to-[#00AA55]/10 blur-3xl animate-pulse-slow" />
                <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#FF6B00]/10 via-transparent to-[#00AA55]/10 blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-[#0066CC]/5 via-transparent to-[#00AA55]/5 blur-3xl" />
          
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-grid-pattern opacity-50" />
          
                {/* Floating dots */}
                <div className="absolute inset-0 bg-dots-pattern opacity-30" />
          
                {/* Floating code particles (deterministik agar pure & hydration aman) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(20)].map((_, i) => {
                    const left = seeded(i) * 100
                    const top = seeded(i + 40) * 100
                    const animationDelay = seeded(i + 80) * 8
                    const animationDuration = 15 + seeded(i + 120) * 10
                    const text = ['{','}', ';', '()', '[]', '//', '/*', '*/', 'int', 'void', 'return', 'if', 'for', 'while', 'struct', 'printf', 'main'][Math.floor(seeded(i + 160) * 16)]
                    return (
                      <div key={i} className="absolute text-[#0066CC]/15 font-mono text-xs animate-float" style={{left: `${left}%`, top: `${top}%`, animationDelay: `${animationDelay}s`, animationDuration: `${animationDuration}s`}}>
                        {text}
                      </div>
                    )
                  })}
                </div>
          
                {/* Subtle noise texture */}
                <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'}} />
              </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0066CC]/10 text-[#0066CC] text-xs font-semibold mb-6 border border-[#0066CC]/20 tracking-wide uppercase">
              <Sparkles className="w-3 h-3" /> Telkom University — Teknik Komputer
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              SEA Laboratory Coding Practice<br /><span className="bg-gradient-to-r from-[#0066CC] via-[#00AA55] to-[#FF6B00] bg-clip-text text-transparent">Inovasi, Riset, dan Pembelajaran</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-10 leading-relaxed">Platform praktikum <strong className="text-white font-semibold">Algoritma & Pemrograman</strong> serta <strong className="text-white font-semibold">Struktur Data Arduino UNO</strong> dengan eksekusi kode real-time di browser.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/learn" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl hover:opacity-90 transition-all font-medium text-base flex items-center justify-center gap-2 shadow-lg shadow-[#0066CC]/25 group"><Play className="w-5 h-5 group-hover:scale-110 transition-transform" /> Mulai Sekarang</Link>
              <Link href="#modules" className="w-full sm:w-auto px-8 py-4 bg-gray-800/80 text-white rounded-xl hover:bg-gray-700/80 transition-all font-medium text-base flex items-center justify-center gap-2 border border-gray-700/60 group"><FileText className="w-5 h-5 group-hover:scale-110 transition-transform" /> Lihat Modul</Link>
            </div>
          </div>
          <div className="mt-8 relative max-w-4xl mx-auto">
            <div className="bg-[#161b22] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066CC] via-[#00AA55] to-[#FF6B00]" />
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1117] border-b border-gray-800">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-[#ff5f56]" /><div className="w-3 h-3 rounded-full bg-[#ffbd2e]" /><div className="w-3 h-3 rounded-full bg-[#27c93f]" /></div>
                <div className="flex-1 text-center text-xs text-gray-400 font-mono">index.c — SEA Laboratory IDE</div>
              </div>
              <pre className="p-6 overflow-x-auto text-xs sm:text-sm font-mono text-gray-300 leading-relaxed relative"><code>{`#include <stdio.h>

int main() {
    printf("SEA LABORATORY\n");
    printf("Algoritma & Pemrograman C\n");
    printf("Struktur Data Arduino UNO\n");
    
    // Contoh: Fibonacci dengan loop
    int n = 10, t1 = 0, t2 = 1, next;
    for (int i = 1; i <= n; ++i) {
        printf("%d ", t1);
        next = t1 + t2;
        t1 = t2;
        t2 = next;
    }
    return 0;
}`}</code></pre>
            </div>
            <div className="absolute -bottom-6 -left-6 w-56 p-4 bg-[#161b22]/90 backdrop-blur-md border border-gray-800/80 rounded-xl shadow-xl animate-float-delayed">
              <div className="flex items-center gap-3 text-gray-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center"><Target className="w-5 h-5 text-white" /></div>
                <div><p className="font-semibold text-white text-sm">Auto-grading</p><p className="text-xs text-gray-400">Cek jawaban otomatis</p></div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-56 p-4 bg-[#161b22]/90 backdrop-blur-md border border-gray-800/80 rounded-xl shadow-xl animate-float-delayed" style={{animationDelay: '1s'}}>
              <div className="flex items-center gap-3 text-gray-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] flex items-center justify-center"><MousePointer className="w-5 h-5 text-white" /></div>
                <div><p className="font-semibold text-white text-sm">Interaktif</p><p className="text-xs text-gray-400">Klik & jalankan langsung</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-[#161b22]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-3xl sm:text-4xl font-extrabold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Fitur Utama Platform</h2><p className="text-gray-400 max-w-2xl mx-auto text-lg">Dirancang khusus untuk praktikum Algoritma & Pemrograman serta Struktur Data di lingkungan SEA Laboratory</p></div>
          <div className="grid md:grid-cols-3 gap-6">{[{icon: Code, title: 'Editor Kode Professional', desc: 'Monaco Editor (VS Code engine) dengan IntelliSense, syntax highlighting, auto-completion untuk C/C++', accent: 'from-[#0066CC] to-[#00AA55]'}, {icon: Zap, title: 'Eksekusi Real-time', desc: 'Jalankan kode C langsung di browser via WebAssembly. Lihat output, error, dan performa secara instan', accent: 'from-[#FF6B00] to-[#FF8C00]'}, {icon: Cpu, title: 'Arduino UNO Simulator', desc: 'Visualisasi pin digital/analog, PWM, Serial Monitor, dan simulasi struktur data di memori terbatas', accent: 'from-[#00AA55] to-[#00CC66]'}].map((feature, i) => (<div key={i} className="group relative p-8 bg-[#0d1117] rounded-2xl border border-gray-800 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,102,204,0.15)]"><div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 rounded-2xl" style={{background: feature.accent}} /><div className="relative z-10"><div className="w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500" style={{background: feature.accent}}><feature.icon className="w-7 h-7 text-white" /></div><h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3><p className="text-gray-400 leading-relaxed">{feature.desc}</p></div></div>))}</div>
        </div>
      </section>

      <section id="modules" className="py-24 px-6 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-3xl sm:text-4xl font-extrabold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Modul Pembelajaran</h2><p className="text-gray-400 max-w-2xl mx-auto text-lg">Kurikulum terstruktur dari dasar hingga lanjutan untuk mahasiswa Teknik Komputer</p></div>
          <div className="grid lg:grid-cols-2 gap-8">{Object.entries(MODULES).map(([key, module]) => (<Link key={key} href={`/learn/${key}`} className="group relative p-8 bg-[#161b22] rounded-2xl border border-gray-800 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,102,204,0.15)] overflow-hidden"><div className="flex items-start gap-4 mb-6"><div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${key === 'c' ? 'from-[#0066CC] to-[#00AA55]' : 'from-[#00AA55] to-[#FF6B00]'}`}>{key === 'c' ? <Code className="w-7 h-7 text-white" /> : <Cpu className="w-7 h-7 text-white" />}</div><div><h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{module.name}</h3><p className="text-gray-400 mt-1">{module.description}</p></div></div><div className="space-y-3">{module.topics.slice(0, 4).map((topic, index) => (<div key={topic.id} className="flex items-center justify-between p-3.5 bg-[#0d1117]/60 rounded-xl border border-gray-800/50 group-hover:border-gray-700/50 transition-all"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-400 group-hover:text-white group-hover:bg-primary/20 transition-all">{index + 1}</div><div><p className="font-medium text-sm text-gray-200">{topic.title}</p><p className="text-xs text-gray-500">{topic.estimatedTime} • {topic.difficulty}</p></div></div><ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" /></div>))}<div className="text-center pt-3"><span className="text-primary font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">Lihat semua {module.topics.length} modul <ChevronRight className="w-4 h-4" /></span></div></div></Link>))}</div>
        </div>
      </section>

      <section id="about" className="py-24 px-6 bg-[#161b22]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div><h2 className="text-3xl sm:text-4xl font-extrabold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Tentang SEA Laboratory</h2><div className="prose prose-invert max-w-none text-gray-300 space-y-5 text-lg leading-relaxed"><p><strong className="text-white">SEA Laboratory (Software Engineering and Application)</strong> adalah laboratorium di bawah Program Studi Teknik Komputer, Telkom University yang berfokus pada pengembangan Software Engineering dan Application.</p><p>Laboratorium ini menaungi praktikum <strong className="text-white">Algoritma & Pemrograman</strong> serta <strong className="text-white">Struktur Data</strong>, menyediakan fasilitas dan bimbingan untuk mahasiswa dalam mengembangkan kemampuan pemrograman dan problem solving.</p><p>Platform ini dikembangkan untuk mendukung pembelajaran berbasis praktik (hands-on) dengan teknologi modern: eksekusi kode di browser, visualisasi struktur data, dan simulasi hardware Arduino UNO.</p></div></div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {icon: Users, title: 'Mahasiswa Aktif', value: '500+'},
                {icon: Trophy, title: 'Proyek Selesai', value: '1200+'},
                {icon: BookOpen, title: 'Modul Tersedia', value: '16'},
                {icon: Zap, title: 'Jam Praktikum', value: '2000+'}
              ].map((stat, i) => (
                <div key={i} className="p-6 bg-[#0d1117] rounded-2xl border border-gray-800 text-center hover:border-primary/50 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-3xl font-extrabold text-white bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">{stat.value}</p>
                  <p className="text-gray-400 text-sm mt-1">{stat.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6"><div className="max-w-3xl mx-auto text-center"><div className="relative p-12 rounded-2xl overflow-hidden bg-[#161b22] border border-gray-800"><div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" /><div className="relative z-10"><h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white">Siap Memulai Perjalanan Coding-mu?</h2><p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">Bergabung dengan ratusan mahasiswa SEA Lab yang sudah menguasai algoritma dan struktur data melalui platform ini.</p><Link href="/learn" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl hover:opacity-90 transition-all font-semibold text-base shadow-lg shadow-[#0066CC]/25 group">Mulai Belajar Sekarang <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></Link></div></div></div></section>

      <footer className="py-10 px-6 border-t border-gray-800 bg-[#0d1117]"><div className="max-w-7xl mx-auto"><div className="flex flex-col md:flex-row items-center justify-between gap-6"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div><span className="font-extrabold text-xl text-white">SEA Laboratory Coding Practice</span></div><p className="text-gray-500 text-sm">© 2025 Telkom University — Teknik Komputer. Software Engineering Application. All rights reserved.</p><div className="flex items-center gap-6 text-sm text-gray-500"><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link><span>•</span><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></div></div></div></footer>
    </div>
  )
}