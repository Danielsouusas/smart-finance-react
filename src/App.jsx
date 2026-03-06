import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// --- CONEXÃO OFICIAL SMART_GDTECH ---
const supabaseUrl = 'https://hoegguhazbiyrpzegard.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZWdndWhhemJpeXJwemVnYXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDk5MDEsImV4cCI6MjA4NTA4NTkwMX0.Csxr-t8ecO5QopNzfgPiFE6ukeLowYVFO-eDkPBe7S4';
const supabase = createClient(supabaseUrl, supabaseKey);

const App = () => {
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [transacoes, setTransacoes] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);

  const meses = [
    { n: 1, nome: "JANEIRO" }, { n: 2, nome: "FEVEREIRO" }, { n: 3, nome: "MARÇO" },
    { n: 4, nome: "ABRIL" }, { n: 5, nome: "MAIO" }, { n: 6, nome: "JUNHO" },
    { n: 7, nome: "JULHO" }, { n: 8, nome: "AGOSTO" }, { n: 9, nome: "SETEMBRO" },
    { n: 10, nome: "OUTUBRO" }, { n: 11, nome: "NOVEMBRO" }, { n: 12, nome: "DEZEMBRO" }
  ];

  const buscarDados = async () => {
    const { data: dataDb } = await supabase.from('transacoes').select('*').order('data', { ascending: true });
    if (dataDb) setTransacoes(dataDb);
  };

  const deletarTransacao = async (id) => {
    if (window.confirm("DESEJA EXCLUIR ESTA OPERAÇÃO?")) {
      await supabase.from('transacoes').delete().eq('id', id);
      buscarDados();
    }
  };

  useEffect(() => { if (logado) buscarDados(); }, [logado]);

  const resumo = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const listaFiltrada = transacoes.filter(t => new Date(t.data).getMonth() + 1 === mesFiltro);
    
    let totalEntradas = 0, totalSaidas = 0;
    let entDia = 0, saiDia = 0;

    transacoes.forEach(t => {
      const v = parseFloat(t.valor) || 0;
      if (t.tipo === 'entrada') totalEntradas += v;
      else totalSaidas += v;
      if (t.data === hoje) {
        if (t.tipo === 'entrada') entDia += v;
        else saiDia += v;
      }
    });

    return { ent: totalEntradas, sai: totalSaidas, saldo: totalEntradas - totalSaidas, lista: listaFiltrada, entDia, saiDia };
  }, [transacoes, mesFiltro]);

  const dadosGrafico = useMemo(() => {
    let acumulado = 0;
    return resumo.lista.map(t => {
      acumulado += (t.tipo === 'entrada' ? Number(t.valor) : -Number(t.valor));
      return { dia: t.data.split('-')[2], saldo: acumulado };
    });
  }, [resumo.lista]);

  const enviarWhatsApp = (valorAtual, isResumo = false) => {
    const msg = isResumo 
      ? `📊 RESUMO DO DIA: Entradas: R$ ${resumo.entDia.toFixed(2)} | Saídas: R$ ${resumo.saiDia.toFixed(2)} | Saldo: R$ ${(resumo.entDia - resumo.saiDia).toFixed(2)}`
      : (valorAtual >= 400 ? `🚀 META BATIDA! Hoje: R$ ${valorAtual.toFixed(2)}` : `⚠️ Meta em curso: R$ ${valorAtual.toFixed(2)} / R$ 400,00`);
    window.open(`https://wa.me/5585992010344?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!logado) {
    return (
      <div style={{ backgroundColor: '#050505', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' }}>
        <div style={{ backgroundColor: '#141414', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '350px', border: '1px solid #00d1b2', textAlign: 'center' }}>
          <h2 style={{ color: '#00d1b2' }}>SMART_GDTECH</h2>
          <form onSubmit={(e) => { e.preventDefault(); if(usuario === 'daniel' && senhaInput === '4321') setLogado(true); else alert('ACESSO NEGADO'); }}>
            <input type="text" placeholder="USER" onChange={e => setUsuario(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', backgroundColor: '#000', color: '#00d1b2', border: '1px solid #333' }} />
            <input type="password" placeholder="PASS" onChange={e => setSenhaInput(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', backgroundColor: '#000', color: '#00d1b2', border: '1px solid #333' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#00d1b2', fontWeight: 'bold', border: 'none', color: '#000', cursor: 'pointer' }}>ACESSAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
      <style>{`
        .cards-resumo { display: flex; gap: 15px; margin-bottom: 20px; }
        .grid-main { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
        @media (max-width: 768px) { .cards-resumo { flex-direction: column; } .grid-main { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ maxWidth: '1000px', margin: 'auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#00d1b2', fontSize: '1.2rem' }}>SMART_GDTECH: INTELIGÊNCIA FINANCEIRA</h2>
          <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} style={{ backgroundColor: '#000', color: '#00d1b2', border: '1px solid #00d1b2' }}>
            {meses.map(m => <option key={m.n} value={m.n}>{m.nome}</option>)}
          </select>
        </header>

        {/* --- NOVOS COMPONENTES ADICIONADOS --- */}
        <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: `1px solid ${resumo.entDia >= 400 ? '#00d1b2' : '#ff3860'}`, marginBottom: '20px' }}>
           <small style={{ color: '#888' }}>META DIÁRIA (R$ 400,00)</small>
           <h2 style={{ color: resumo.entDia >= 400 ? '#00d1b2' : '#ff3860', margin: '5px 0' }}>{resumo.entDia >= 400 ? '✅ META BATIDA!' : `EM BUSCA: R$ ${resumo.entDia.toFixed(2)}`}</h2>
        </div>

        <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#00d1b2' }}>RESUMO DO DIA</h4>
          <p>Entradas: R$ {resumo.entDia.toFixed(2)} | Saídas: R$ {resumo.saiDia.toFixed(2)}</p>
          <button onClick={() => enviarWhatsApp(0, true)} style={{ backgroundColor: '#25d366', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '5px' }}>ENVIAR RESUMO NO WHATSAPP</button>
        </div>

        <div className="cards-resumo">
          <div style={{ flex: 1, backgroundColor: '#161616', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #00d1b2' }}>
            <small style={{ color: '#888' }}>ENTRADAS</small>
            <h2>R$ {resumo.ent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div style={{ flex: 1, backgroundColor: '#161616', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #ff3860' }}>
            <small style={{ color: '#888' }}>SAÍDAS</small>
            <h2>R$ {resumo.sai.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>

        <div style={{ backgroundColor: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333', marginBottom: '20px', height: '220px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="dia" stroke="#555" />
              <YAxis stroke="#555" />
              <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
              <Area type="monotone" dataKey="saldo" stroke="#00d1b2" fill="#00d1b2" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid-main">
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const val = parseFloat(valor.replace(',', '.'));
              await supabase.from('transacoes').insert([{ descricao: descricao.toUpperCase(), valor: val, tipo, data }]);
              await buscarDados();
              if (tipo === 'entrada') enviarWhatsApp(resumo.entDia + val);
              setDescricao(''); setValor('');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="DESCRIÇÃO" value={descricao} onChange={e => setDescricao(e.target.value)} required style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff' }} />
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff' }}>
                <option value="entrada">ENTRADA (+)</option>
                <option value="saida">SAÍDA (-)</option>
              </select>
              <input type="text" placeholder="VALOR R$" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff' }} />
              <button type="submit" style={{ padding: '12px', backgroundColor: '#00d1b2', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>EXECUTAR ORDEM</button>
            </form>
          </div>

          <div style={{ backgroundColor: '#161616', borderRadius: '12px', border: '1px solid #333', height: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {resumo.lista.slice().reverse().map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px' }}>{t.descricao}</td>
                    <td style={{ textAlign: 'right', color: t.tipo === 'entrada' ? '#00d1b2' : '#ff3860' }}>
                      {t.tipo === 'entrada' ? '+' : '-'} {Number(t.valor).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => deletarTransacao(t.id)} style={{ background: 'none', border: 'none', color: '#ff3860', cursor: 'pointer' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;