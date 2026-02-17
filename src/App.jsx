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
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1); // Janeiro = 1

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

  useEffect(() => { if (logado) buscarDados(); }, [logado]);

  // --- CÁLCULO À PROVA DE ERROS ---
  const resumo = useMemo(() => {
    const listaFiltrada = transacoes.filter(t => {
      if (!t.data) return false;
      const mesItem = parseInt(t.data.split('-')[1], 10);
      return mesItem === mesFiltro;
    });

    let totalEntradas = 0;
    let totalSaidas = 0;

    listaFiltrada.forEach(t => {
      const v = parseFloat(t.valor) || 0;
      if (t.tipo === 'entrada') totalEntradas += v;
      else totalSaidas += v;
    });

    return { 
      ent: totalEntradas, 
      sai: totalSaidas, 
      saldo: totalEntradas - totalSaidas, 
      lista: listaFiltrada 
    };
  }, [transacoes, mesFiltro]);

  const dadosGrafico = useMemo(() => {
    let acumulado = 0;
    return resumo.lista.map(t => {
      acumulado += (t.tipo === 'entrada' ? Number(t.valor) : -Number(t.valor));
      return { dia: t.data.split('-')[2], saldo: acumulado };
    });
  }, [resumo.lista]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (usuario === 'admin' && senhaInput === '123') setLogado(true);
    else alert("ACESSO NEGADO");
  };

  if (!logado) {
    return (
      <div style={{ backgroundColor: '#050505', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' }}>
        <div style={{ backgroundColor: 'rgba(20, 20, 20, 0.9)', padding: '40px', borderRadius: '20px', width: '350px', border: '1px solid #00d1b2', textAlign: 'center' }}>
          <h2 style={{ color: '#00d1b2', letterSpacing: '3px' }}>SMART_GDTECH</h2>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="USER" onChange={(e) => setUsuario(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', backgroundColor: '#000', color: '#00d1b2', border: '1px solid #333' }} />
            <input type="password" placeholder="PASS" onChange={(e) => setSenhaInput(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', backgroundColor: '#000', color: '#00d1b2', border: '1px solid #333' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#00d1b2', fontWeight: 'bold', border: 'none', color: '#000', cursor: 'pointer' }}>ACESSAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'monospace', padding: '20px' }}>
      <div style={{ maxWidth: '1000px', margin: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#00d1b2' }}>$ SMART_GDTECH_OS</h2>
          <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} style={{ backgroundColor: '#000', color: '#00d1b2', border: '1px solid #00d1b2', padding: '5px' }}>
            {meses.map(m => <option key={m.n} value={m.n}>{m.nome}</option>)}
          </select>
        </header>

        {/* CARDS DE VALORES - AGORA SAI DO ZERO */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <div style={{ flex: 1, backgroundColor: '#161616', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #00d1b2' }}>
            <small style={{ color: '#888' }}>ENTRADAS</small>
            <h2 style={{ color: '#00d1b2', margin: '5px 0' }}>R$ {resumo.ent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div style={{ flex: 1, backgroundColor: '#161616', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #ff3860' }}>
            <small style={{ color: '#888' }}>SAÍDAS</small>
            <h2 style={{ color: '#ff3860', margin: '5px 0' }}>R$ {resumo.sai.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>

        {/* GRÁFICO */}
        <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #333', marginBottom: '20px', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="dia" stroke="#555" />
                <YAxis stroke="#555" />
                <Tooltip contentStyle={{backgroundColor:'#000', border: '1px solid #333'}} />
                <Area type="monotone" dataKey="saldo" stroke="#00d1b2" fill="#00d1b2" fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const nova = { descricao: descricao.toUpperCase(), valor: parseFloat(valor.replace(',','.')), tipo, data, categoria: tipo === 'entrada' ? 'RECEITA' : 'DIVERSOS' };
              await supabase.from('transacoes').insert([nova]);
              buscarDados(); setDescricao(''); setValor('');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="DESCRIÇÃO" value={descricao} onChange={e => setDescricao(e.target.value)} style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff' }} />
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff' }}>
                <option value="entrada">ENTRADA (+)</option>
                <option value="saida">SAÍDA (-)</option>
              </select>
              <input type="text" placeholder="VALOR R$" value={valor} onChange={e => setValor(e.target.value)} style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff' }} />
              <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff' }} />
              <button type="submit" style={{ padding: '15px', backgroundColor: '#00d1b2', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>EXECUTAR ORDEM</button>
            </form>
          </div>

          <div style={{ backgroundColor: '#161616', borderRadius: '12px', border: '1px solid #333', height: '350px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#222' }}>
                <tr style={{ color: '#555', fontSize: '11px', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>DATA</th>
                  <th>DESCRIÇÃO</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>VALOR</th>
                </tr>
              </thead>
              <tbody>
                {resumo.lista.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px', fontSize: '11px', color: '#888' }}>{t.data.split('-').reverse().slice(0,2).join('/')}</td>
                    <td style={{ fontSize: '13px' }}>{t.descricao}</td>
                    <td style={{ textAlign: 'right', paddingRight: '20px', color: t.tipo === 'entrada' ? '#00d1b2' : '#ff3860', fontWeight: 'bold' }}>
                      {t.tipo === 'entrada' ? '+' : '-'} {Number(t.valor).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer style={{ marginTop: '50px', padding: '20px', textAlign: 'center', borderTop: '1px solid #222' }}>
            <p style={{ color: '#555', fontSize: '12px' }}>SISTEMA SMART_GDTECH: INTELIGÊNCIA ESTRATÉGICA APLICADA ÀS SUAS FINANÇAS.</p>
            <p style={{ color: '#333', fontSize: '10px', fontStyle: 'italic' }}>"Transformando dados brutos em decisões de alto impacto."</p>
        </footer>
      </div>
    </div>
  );
};

export default App;