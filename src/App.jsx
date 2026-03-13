import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';

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
    let totalEntradasMes = 0, totalSaidasMes = 0;
    let entDia = 0, saiDia = 0;

    transacoes.forEach(t => {
      const v = parseFloat(t.valor) || 0;
      const dataFormatadaBanco = t.data ? t.data.substring(0, 10) : "";
      const mesTransacao = t.data ? parseInt(t.data.split('-')[1]) : 0;

      if (mesTransacao === mesFiltro) {
        if (t.tipo === 'entrada') totalEntradasMes += v;
        else totalSaidasMes += v;
      }

      if (dataFormatadaBanco === data) {
        if (t.tipo === 'entrada') entDia += v;
        else saiDia += v;
      }
    });

    return { ent: totalEntradasMes, sai: totalSaidasMes, lista: transacoes.filter(t => t.data && parseInt(t.data.split('-')[1]) === mesFiltro), entDia, saiDia };
  }, [transacoes, mesFiltro, data]);

  const dadosGrafico = useMemo(() => {
    let acumulado = 0;
    return resumo.lista.map(t => {
      const v = Number(t.valor);
      acumulado += (t.tipo === 'entrada' ? v : -v);
      return { dia: t.data ? t.data.substring(8, 10) : "", saldo: acumulado, entrada: t.tipo === 'entrada' ? v : 0, saida: t.tipo === 'saida' ? v : 0 };
    });
  }, [resumo.lista]);

  const enviarWhatsApp = () => {
    const dataBr = data.split('-').reverse().join('/');
    const msg = `📊 RESUMO DO DIA ${dataBr}:\nEntradas: R$ ${resumo.entDia.toFixed(2)}\nSaídas: R$ ${resumo.saiDia.toFixed(2)}\nSaldo: R$ ${(resumo.entDia - resumo.saiDia).toFixed(2)}`;
    window.open(`https://wa.me/5585992010344?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!logado) {
    return (
      <div style={{ backgroundColor: '#050505', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' }}>
        <div style={{ backgroundColor: '#141414', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '350px', border: '1px solid #00d1b2', textAlign: 'center' }}>
          <h2 style={{ color: '#00d1b2' }}>SMART_GDTECH</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (usuario === 'daniel' && senhaInput === '4321') setLogado(true); else alert('ACESSO NEGADO'); }}>
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
      <style>{`.cards-resumo { display: flex; gap: 15px; margin-bottom: 20px; } .grid-main { display: grid; grid-template-columns: 320px 1fr; gap: 20px; } @media (max-width: 768px) { .cards-resumo { flex-direction: column; } .grid-main { grid-template-columns: 1fr; } }`}</style>
      <div style={{ maxWidth: '1000px', margin: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#00d1b2', fontSize: '1.2rem' }}>SMART_GDTECH: INTELIGÊNCIA FINANCEIRA</h2>
          <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} style={{ backgroundColor: '#000', color: '#00d1b2', border: '1px solid #00d1b2' }}>
            {meses.map(m => <option key={m.n} value={m.n}>{m.nome}</option>)}
          </select>
        </header>

        {/* --- SEÇÃO DE METAS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Meta Diária */}
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: `1px solid ${resumo.entDia >= 400 ? '#00d1b2' : '#ff3860'}` }}>
            <small style={{ color: '#888' }}>META DIÁRIA (R$ 400,00)</small>
            <h2 style={{ color: resumo.entDia >= 400 ? '#00d1b2' : '#ff3860', margin: '5px 0' }}>{resumo.entDia >= 400 ? '✅ META BATIDA!' : `HOJE: R$ ${resumo.entDia.toFixed(2)}`}</h2>
          </div>

          {/* Meta Mensal com Barra de Progresso */}
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <small style={{ color: '#888' }}>PROGRESSO MENSAL (R$ 12.000,00)</small>
              <small style={{ color: '#00d1b2', fontWeight: 'bold' }}>{((resumo.ent / 12000) * 100).toFixed(1)}%</small>
            </div>
            <div style={{ width: '100%', backgroundColor: '#333', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((resumo.ent / 12000) * 100, 100)}%`, height: '100%', backgroundColor: '#00d1b2', transition: 'width 0.8s ease-in-out', boxShadow: '0 0 10px #00d1b2' }} />
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '10px', color: '#aaa' }}>Acumulado: R$ {resumo.ent.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* --- RESUMO DO DIA SELECIONADO --- */}
        <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h4 style={{ margin: 0, color: '#00d1b2' }}>RESUMO DO DIA: {data.split('-').reverse().join('/')}</h4>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ backgroundColor: '#000', color: '#00d1b2', border: '1px solid #333', padding: '8px', borderRadius: '5px' }} />
          </div>
          <div style={{ margin: '15px 0', fontSize: '1.1rem' }}>
            <span>Entradas: <b style={{color: '#00d1b2'}}>R$ {resumo.entDia.toFixed(2)}</b></span>
            <span style={{ margin: '0 15px', color: '#333' }}>|</span>
            <span>Saídas: <b style={{color: '#ff3860'}}>R$ {resumo.saiDia.toFixed(2)}</b></span>
          </div>
          <button onClick={enviarWhatsApp} style={{ backgroundColor: '#25d366', border: 'none', padding: '12px 20px', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold', color: '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
             ENVIAR NO WHATSAPP
          </button>
        </div>

        {/* Gráfico de Performance */}
        <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '12px', border: '1px solid #333', marginBottom: '20px', height: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="dia" stroke="#555" tick={{fontSize: 12}} />
              <YAxis stroke="#555" tick={{fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff' }} />
              <Area type="monotone" dataKey="saldo" stroke="#00d1b2" fill="#00d1b2" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="saida" stroke="#ff3860" fill="#ff3860" fillOpacity={0.05} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid-main">
          {/* Formulário */}
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
            <h4 style={{ color: '#888', marginTop: 0 }}>NOVA OPERAÇÃO</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const val = parseFloat(valor.replace(',', '.'));
              await supabase.from('transacoes').insert([{ descricao: descricao.toUpperCase(), valor: val, tipo, data }]);
              await buscarDados();
              setDescricao(''); setValor('');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="DESCRIÇÃO" value={descricao} onChange={e => setDescricao(e.target.value)} required style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }}>
                <option value="entrada">ENTRADA (+)</option>
                <option value="saida">SAÍDA (-)</option>
              </select>
              <input type="text" placeholder="VALOR R$" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
              <button type="submit" style={{ padding: '14px', backgroundColor: '#00d1b2', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px', color: '#000' }}>EXECUTAR ORDEM</button>
            </form>
          </div>

          {/* Lista de Transações */}
          <div style={{ backgroundColor: '#161616', borderRadius: '12px', border: '1px solid #333', height: '420px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#222', textAlign: 'left', fontSize: '0.8rem', color: '#888' }}>
                  <th style={{ padding: '12px' }}>DESCRIÇÃO</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>VALOR</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {resumo.lista.slice().reverse().map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px' }}>{t.descricao}</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: t.tipo === 'entrada' ? '#00d1b2' : '#ff3860', fontWeight: 'bold' }}>
                      {t.tipo === 'entrada' ? '+' : '-'} {Number(t.valor).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <button onClick={() => deletarTransacao(t.id)} style={{ background: 'none', border: 'none', color: '#ff3860', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
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