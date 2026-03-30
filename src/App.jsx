import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const supabaseUrl = 'https://hoegguhazbiyrpzegard.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZWdndWhhemJpeXJwemVnYXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDk5MDEsImV4cCI6MjA4NTA4NTkwMX0.Csxr-t8ecO5QopNzfgPiFE6ukeLowYVFO-eDkPBe7S4';
const supabase = createClient(supabaseUrl, supabaseKey);

const App = () => {
  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DO SISTEMA ---
  const [transacoes, setTransacoes] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('entrada');

  const obtenerDataLocal = () => {
    const d = new Date();
    const fuso = d.getTimezoneOffset() * 60000;
    return new Date(d - fuso).toISOString().split('T')[0];
  };

  const [data, setData] = useState(obtenerDataLocal());
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [visivel, setVisivel] = useState(true);

  const meses = [
    { n: 1, nome: "JANEIRO" }, { n: 2, nome: "FEVEREIRO" }, { n: 3, nome: "MARÇO" },
    { n: 4, nome: "ABRIL" }, { n: 5, nome: "MAIO" }, { n: 6, nome: "JUNHO" },
    { n: 7, nome: "JULHO" }, { n: 8, nome: "AGOSTO" }, { n: 9, nome: "SETEMBRO" },
    { n: 10, nome: "OUTUBRO" }, { n: 11, nome: "NOVEMBRO" }, { n: 12, nome: "DEZEMBRO" }
  ];

  const normalizarTexto = (texto = '') =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

  const ehCombustivel = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["GASOLINA", "POSTO", "COMBUSTIVEL", "ETANOL", "DIESEL"].some(item => desc.includes(item));
  };

  const ehMercado = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["MERCADO", "SUPERMERCADO", "COMPRAS", "MERCADINHO", "ATACADAO", "ASSAI"].some(item => desc.includes(item));
  };

  const parseValor = (valorBruto = 0) => {
    if (typeof valorBruto === 'number') return valorBruto;

    const texto = String(valorBruto).trim().replace(/[^\d,.-]/g, '');
    if (!texto) return 0;

    if (texto.includes(',') && texto.includes('.')) {
      if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
        return Number(texto.replace(/\./g, '').replace(',', '.')) || 0;
      }
      return Number(texto.replace(/,/g, '')) || 0;
    }

    return Number(texto.replace(',', '.')) || 0;
  };

  const obterCategoriaTransacao = (tipo = '', descricao = '') => {
    const tipoNormalizado = normalizarTexto(tipo);

    if (tipoNormalizado.includes('ENTRADA')) return 'entrada';
    if (tipoNormalizado.includes('COMBUST')) return 'combustivel';
    if (tipoNormalizado.includes('MERCAD') || tipoNormalizado.includes('SUPERMERC')) return 'mercado';
    if (tipoNormalizado.includes('SAIDA') || tipoNormalizado.includes('DESPESA')) return 'saida';
    if (ehCombustivel(descricao)) return 'combustivel';
    if (ehMercado(descricao)) return 'mercado';

    return 'saida';
  };

  // --- LÓGICA DE SESSÃO ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const buscarDados = async () => {
    const { data: dataDb } = await supabase.from('transacoes').select('*').order('data', { ascending: true });
    if (dataDb) setTransacoes(dataDb);
  };

  useEffect(() => { if (session) buscarDados(); }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("ACESSO NEGADO: " + error.message);
    setLoading(false);
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setTransacoes([]); 
  };

  const deletarTransacao = async (id) => {
    if (window.confirm("DESEJA EXCLUIR ESTA OPERAÇÃO?")) {
      await supabase.from('transacoes').delete().eq('id', id);
      buscarDados();
    }
  };

  // --- CÁLCULOS E INTELIGÊNCIA ---
  const resumo = useMemo(() => {
    let totalEntradasMes = 0, totalSaidasMes = 0, entDia = 0, saiDia = 0, totalCombustivel = 0, totalMercado = 0;
    let acumuladoEntradasAte27 = 0, acumuladoSaidasAte27 = 0, acumuladoCombustivelAte27 = 0, acumuladoMercadoAte27 = 0;
    let acumuladoEntradasAte31 = 0, acumuladoSaidasAte31 = 0, acumuladoCombustivelAte31 = 0, acumuladoMercadoAte31 = 0;

    transacoes.forEach(t => {
      const v = parseValor(t.valor);
      const dFormatada = t.data ? t.data.substring(0, 10) : "";
      const mTrans = t.data ? parseInt(t.data.split('-')[1], 10) : 0;
      const diaNumero = t.data ? parseInt(t.data.split('-')[2], 10) : 0;
      const categoria = obterCategoriaTransacao(t.tipo, t.descricao);
      const isEntrada = categoria === 'entrada';
      const isSaida = categoria === 'saida' || categoria === 'combustivel' || categoria === 'mercado';
      const isCombustivel = categoria === 'combustivel' || ehCombustivel(t.descricao);
      const isMercado = categoria === 'mercado' || ehMercado(t.descricao);

      if (mTrans === mesFiltro) {
        if (isEntrada) totalEntradasMes += v;
        if (isSaida) totalSaidasMes += v;
        if (isSaida && isCombustivel) totalCombustivel += v;
        if (isSaida && isMercado) totalMercado += v;

        if (diaNumero <= 27) {
          if (isEntrada) acumuladoEntradasAte27 += v;
          if (isSaida) acumuladoSaidasAte27 += v;
          if (isSaida && isCombustivel) acumuladoCombustivelAte27 += v;
          if (isSaida && isMercado) acumuladoMercadoAte27 += v;
        }

        if (diaNumero <= 31) {
          if (isEntrada) acumuladoEntradasAte31 += v;
          if (isSaida) acumuladoSaidasAte31 += v;
          if (isSaida && isCombustivel) acumuladoCombustivelAte31 += v;
          if (isSaida && isMercado) acumuladoMercadoAte31 += v;
        }
      }

      if (dFormatada === data) {
        if (isEntrada) entDia += v;
        else saiDia += v;
      }
    });

    return { ent: totalEntradasMes, sai: totalSaidasMes, lista: transacoes, entDia, saiDia, totalCombustivel, totalMercado, acumuladoEntradasAte27, acumuladoSaidasAte27, acumuladoCombustivelAte27, acumuladoMercadoAte27, acumuladoEntradasAte31, acumuladoSaidasAte31, acumuladoCombustivelAte31, acumuladoMercadoAte31 };
  }, [transacoes, mesFiltro, data]);

  // --- GRÁFICO AGRUPADO POR DIA ---
  const dadosGrafico = useMemo(() => {
    const agrupado = {};

    transacoes
      .filter(t => t.data && parseInt(t.data.split('-')[1], 10) === mesFiltro)
      .forEach(t => {
        const dia = t.data ? t.data.substring(8, 10) : "00";
        const categoria = obterCategoriaTransacao(t.tipo, t.descricao);

        if (!agrupado[dia]) agrupado[dia] = { dia, entrada: 0, saida: 0 };

        const v = parseValor(t.valor);
        categoria === 'entrada' ? agrupado[dia].entrada += v : agrupado[dia].saida += v;
      });

    return Object.values(agrupado).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [transacoes, mesFiltro]);

  const enviarWhatsApp = () => {
    const dataBr = data.split('-').reverse().join('/');
    const msg = `📊 SMART-GDTEC: RESUMO ${dataBr}\nEntradas: R$ ${resumo.entDia.toFixed(2)}\nSaídas: R$ ${resumo.saiDia.toFixed(2)}\nSaldo: R$ ${(resumo.entDia - resumo.saiDia).toFixed(2)}`;
    window.open(`https://wa.me/5585992010344?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const Mascarar = (v) => visivel ? v : "****";

  // --- TELA DE LOGIN ---
  if (!session) {
    return (
      <div style={{ backgroundColor: '#000814', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' }}>
        <div style={{ backgroundColor: '#001d3d', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '350px', border: '1px solid #007BFF', textAlign: 'center', boxShadow: '0 0 30px #007BFF' }}>
          <h2 style={{ color: '#007BFF', textShadow: '0 0 10px #007BFF' }}>SMART-GDTEC</h2>
          <form onSubmit={handleLogin} style={{marginTop: '20px'}}>
            <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', marginBottom: '10px', backgroundColor: '#000', color: '#007BFF', border: '1px solid #007BFF', borderRadius: '5px' }} />
            <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px', marginBottom: '20px', backgroundColor: '#000', color: '#007BFF', border: '1px solid #007BFF', borderRadius: '5px' }} />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#007BFF', fontWeight: 'bold', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '5px' }}>
              {loading ? 'CARREGANDO...' : 'ENTRAR'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD PRINCIPAL ---
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
      <style>{`.grid-main { display: grid; grid-template-columns: 320px 1fr; gap: 20px; } @media (max-width: 768px) { .grid-main { grid-template-columns: 1fr; } } @keyframes piscar { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } } .piscar { animation: piscar 0.5s infinite; }`}</style>
      <div style={{ maxWidth: '1000px', margin: 'auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#00d1b2', fontSize: '1.2rem', margin: 0 }}>SMART-GDTEC</h2>
            <small style={{ color: '#666' }}>USUÁRIO: {session.user.email}</small>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setVisivel(!visivel)} style={{ background: 'none', border: '1px solid #00d1b2', color: '#00d1b2', cursor: 'pointer', borderRadius: '5px', padding: '5px 10px' }}>{visivel ? '👁️' : '🙈'}</button>
            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #ff3860', color: '#ff3860', cursor: 'pointer', borderRadius: '5px', padding: '5px 10px' }}>SAIR</button>
            <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} style={{ backgroundColor: '#000', color: '#00d1b2', border: '1px solid #00d1b2' }}>
              {meses.map(m => <option key={m.n} value={m.n}>{m.nome}</option>)}
            </select>
          </div>
        </header>

        {/* --- CARDS DE GASTOS ESPECÍFICOS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #f39c12' }}>
            <small style={{ color: '#888' }}>⛽ COMBUSTÍVEL (MÊS)</small>
            <h3 style={{ margin: '5px 0', color: '#f39c12' }}>R$ {Mascarar(resumo.totalCombustivel.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #3498db' }}>
            <small style={{ color: '#888' }}>🛒 MERCADO (MÊS)</small>
            <h3 style={{ margin: '5px 0', color: '#3498db' }}>R$ {Mascarar(resumo.totalMercado.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #9b59b6' }}>
            <small style={{ color: '#888' }}>📥 ENTRADA (1-31)</small>
            <h3 style={{ margin: '5px 0', color: '#9b59b6' }}>R$ {Mascarar(resumo.acumuladoEntradasAte31.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #e74c3c' }}>
            <small style={{ color: '#888' }}>📤 SAÍDA (1-31)</small>
            <h3 style={{ margin: '5px 0', color: '#e74c3c' }}>R$ {Mascarar(resumo.acumuladoSaidasAte31.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #f39c12' }}>
            <small style={{ color: '#888' }}>⛽ COMBUSTÍVEL (1-31)</small>
            <h3 style={{ margin: '5px 0', color: '#f39c12' }}>R$ {Mascarar(resumo.acumuladoCombustivelAte31.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #3498db' }}>
            <small style={{ color: '#888' }}>🛒 MERCADO (1-31)</small>
            <h3 style={{ margin: '5px 0', color: '#3498db' }}>R$ {Mascarar(resumo.acumuladoMercadoAte31.toFixed(2))}</h3>
          </div>
        </div>

        {/* --- CARDS DE METAS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          
          {/* META DIÁRIA R$ 400 */}
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #00d1b2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#00d1b2', fontWeight: 'bold' }}>PROGRESSO DIÁRIO (R$ 400)</small>
              <small style={{ color: '#00d1b2' }}>{((resumo.entDia / 400) * 100).toFixed(0)}% - R$ {Mascarar(resumo.entDia.toFixed(2))}</small>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
              <small style={{ color: '#00d1b2' }}>R$ {Mascarar(resumo.entDia.toFixed(2))} de R$ 400</small>
              <small style={{ color: '#00d1b2' }}>{(resumo.entDia >= 400 ? 'META BATIDA' : `FALTAM R$ ${Math.max(0, (400 - resumo.entDia)).toFixed(2)}`)}</small>
            </div>
            <div style={{ width: '100%', backgroundColor: '#333', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((resumo.entDia / 400) * 100, 100)}%`, height: '100%', backgroundColor: '#00d1b2', boxShadow: '0 0 10px #00d1b2', transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* META MENSAL R$ 10.000 */}
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #00d1b2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#00d1b2', fontWeight: 'bold' }}>META MENSAL (R$ 10.000)</small>
              <small style={{ color: '#00d1b2' }}>{((resumo.ent / 10000) * 100).toFixed(1)}%</small>
            </div>
            <div style={{ width: '100%', backgroundColor: '#333', height: '12px', borderRadius: '6px', margin: '10px 0', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((resumo.ent / 10000) * 100, 100)}%`, height: '100%', backgroundColor: '#00d1b2', boxShadow: '0 0 10px #00d1b2', transition: 'width 0.5s' }} />
            </div>
            <h2 style={{ color: '#00d1b2', margin: '0' }}>R$ {Mascarar(resumo.ent.toLocaleString('pt-BR'))}</h2>
          </div>

          {/* METAS BATIDAS - EFEITO PISCA */}
          {resumo.entDia >= 400 && resumo.ent >= 10000 && (
            <div className="piscar" style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '2px solid #00ff00', textAlign: 'center', gridColumn: 'span 2' }}>
              <h2 style={{ color: '#00ff00', margin: '10px 0', fontSize: '1.8rem', textShadow: '0 0 15px #00ff00' }}>🎉 PARABÉNS!</h2>
              <small style={{ color: '#00ff00', fontWeight: 'bold' }}>AMBAS AS METAS FORAM ATINGIDAS!</small>
              <p style={{ color: '#00ff00', margin: '10px 0', fontSize: '0.9rem' }}>✓ Meta Diária Batida ✓ Meta Mensal Batida</p>
            </div>
          )}
        </div>
        </div>

        {/* --- FILTRO E WHATSAPP --- */}
        <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#00d1b2' }}>FILTRAR DIA: {data.split('-').reverse().join('/')}</h4>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ backgroundColor: '#000', color: '#00d1b2', border: '1px solid #333', padding: '8px', borderRadius: '5px' }} />
          </div>
          <button onClick={enviarWhatsApp} style={{ backgroundColor: '#25d366', border: 'none', padding: '12px 20px', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold', color: '#000', width: '100%', marginTop: '15px' }}>NOTIFICAR NO WHATSAPP</button>
        </div>

        {/* --- GRÁFICO --- */}
        <div style={{ backgroundColor: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)', padding: '25px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px', height: '350px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#00d1b2', margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>FLUXO DO MÊS</h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#00d1b2', borderRadius: '2px' }}></div>
                <small style={{ color: '#888' }}>Entradas</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#ff3860', borderRadius: '2px' }}></div>
                <small style={{ color: '#888' }}>Saídas</small>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={dadosGrafico} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d1b2" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00d1b2" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3860" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ff3860" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
              <XAxis dataKey="dia" stroke="#555" style={{ fontSize: '0.85rem' }} />
              <YAxis stroke="#555" style={{ fontSize: '0.85rem' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00d1b2', borderRadius: '8px', color: '#fff', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.8)' }} formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Area type="monotone" dataKey="entrada" stroke="#00d1b2" fillOpacity={1} fill="url(#colorEntrada)" strokeWidth={2.5} isAnimationActive={true} />
              <Area type="monotone" dataKey="saida" stroke="#ff3860" fillOpacity={1} fill="url(#colorSaida)" strokeWidth={2.5} isAnimationActive={true} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid-main">
          {/* --- FORMULÁRIO --- */}
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
            <h4 style={{ color: '#888', marginTop: 0 }}>NOVA OPERAÇÃO</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const val = parseValor(valor);
              await supabase.from('transacoes').insert([{ descricao: descricao.toUpperCase(), valor: val, tipo, data }]);
              await buscarDados(); setDescricao(''); setValor('');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="DESCRIÇÃO" value={descricao} onChange={e => setDescricao(e.target.value)} required style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }}>
                <option value="entrada">ENTRADA (+)</option>
                <option value="saida">SAÍDA (-)</option>
                <option value="combustivel">COMBUSTÍVEL (⛽)</option>
                <option value="mercado">MERCADO (🛒)</option>
              </select>
              <input type="text" placeholder="VALOR R$" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
              <button type="submit" style={{ padding: '14px', backgroundColor: '#00d1b2', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px', color: '#000' }}>EXECUTAR</button>
            </form>
          </div>

          {/* --- TABELA --- */}
          <div style={{ backgroundColor: '#161616', borderRadius: '12px', border: '1px solid #333', height: '420px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#222', textAlign: 'left', fontSize: '0.8rem', color: '#888' }}>
                  <th style={{ padding: '12px' }}>DATA</th>
                  <th style={{ padding: '12px' }}>DESCRIÇÃO</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>VALOR</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>X</th>
                </tr>
              </thead>
              <tbody>
                {resumo.lista.slice().reverse().map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px', fontSize: '0.75rem', color: '#666' }}>{t.data ? t.data.substring(8,10)+'/'+t.data.substring(5,7) : '--'}</td>
                    <td style={{ padding: '12px' }}>{t.descricao}</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: obterCategoriaTransacao(t.tipo, t.descricao) === 'entrada' ? '#00d1b2' : '#ff3860', fontWeight: 'bold' }}>
                      R$ {Mascarar(parseValor(t.valor).toFixed(2))}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => deletarTransacao(t.id)} style={{ background: 'none', border: 'none', color: '#ff3860', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
  
};

export default App;