import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  PlusCircle, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Trash2, 
  DollarSign,
  Lock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');

  const MINHA_SENHA = "1234"; 

  useEffect(() => {
    if (isAuthorized) {
      fetchTransactions();
    }
  }, [isAuthorized]);

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Erro ao buscar:', error);
    else setTransactions(data || []);
  }

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === MINHA_SENHA) {
      setIsAuthorized(true);
    } else {
      alert("Senha incorreta! ❌");
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    const { data, error } = await supabase
      .from('transacoes')
      .insert([{ 
        descricao: title, 
        valor: parseFloat(amount), 
        tipo: type 
      }])
      .select();

    if (error) {
      alert("Erro ao salvar!");
    } else {
      setTransactions([data[0], ...transactions]);
      setTitle('');
      setAmount('');
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('transacoes')
      .delete()
      .eq('id', id);

    if (error) alert("Erro ao deletar!");
    else setTransactions(transactions.filter(t => t.id !== id));
  };

  // --- CÁLCULOS BLINDADOS (Lê qualquer variação de nome) ---
  const totalIncome = transactions
    .filter(t => {
      const tipo = t.tipo?.toLowerCase() || "";
      return tipo.includes('entrad') || tipo === 'income';
    })
    .reduce((acc, t) => acc + Number(t.valor || 0), 0);

  const totalOutcome = transactions
    .filter(t => {
      const tipo = t.tipo?.toLowerCase() || "";
      return tipo.includes('said') || tipo.includes('saíd') || tipo === 'outcome';
    })
    .reduce((acc, t) => acc + Number(t.valor || 0), 0);

  const totalBalance = totalIncome - totalOutcome;

  const chartData = [
    { name: 'Entradas', valor: totalIncome, color: '#00b37e' },
    { name: 'Saídas', valor: totalOutcome, color: '#f75a68' }
  ];

  if (!isAuthorized) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121214', color: 'white', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ textAlign: 'center', padding: '2.5rem', background: '#202024', borderRadius: '12px', border: '1px solid #323238' }}>
          <Lock size={48} style={{ marginBottom: '1rem', color: '#00b37e' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Acesso Restrito</h2>
          <p style={{ color: '#8d8d99', marginBottom: '1.5rem' }}>Digite a senha do Smart Finance</p>
          <input 
            type="password" 
            placeholder="Senha"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ width: '100%', padding: '14px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #121214', background: '#121214', color: 'white' }}
          />
          <button type="submit" style={{ width: '100%', padding: '14px', background: '#00b37e', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            Acessar Sistema
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121214', color: '#e1e1e6', fontFamily: 'sans-serif', padding: '20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#00b37e' }}>Smart Finance 🚀</h1>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Cards de Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: '#29292e', padding: '24px', borderRadius: '8px', borderLeft: '4px solid #00b37e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8d8d99' }}>Entradas <ArrowUpCircle color="#00b37e" /></div>
            <h2 style={{ fontSize: '28px', marginTop: '10px' }}>R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div style={{ background: '#29292e', padding: '24px', borderRadius: '8px', borderLeft: '4px solid #f75a68' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8d8d99' }}>Saídas <ArrowDownCircle color="#f75a68" /></div>
            <h2 style={{ fontSize: '28px', marginTop: '10px' }}>R$ {totalOutcome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div style={{ background: totalBalance >= 0 ? '#015f43' : '#aa2834', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>Total <DollarSign /></div>
            <h2 style={{ fontSize: '28px', marginTop: '10px' }}>R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>

        {/* Gráfico */}
        <div style={{ background: '#202024', padding: '25px', borderRadius: '8px', marginBottom: '40px', height: '350px', border: '1px solid #323238' }}>
          <h3 style={{ marginBottom: '20px' }}>Fluxo de Caixa</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#323238" vertical={false} />
              <XAxis dataKey="name" stroke="#8d8d99" />
              <YAxis stroke="#8d8d99" />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#202024', borderRadius: '8px', border: '1px solid #323238' }} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Formulário */}
        <form onSubmit={handleAddTransaction} style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <input 
            style={{ flex: 2, minWidth: '200px', padding: '14px', background: '#121214', border: '1px solid #323238', borderRadius: '6px', color: 'white' }}
            placeholder="Ex: Aluguel, Salário..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input 
            style={{ flex: 1, minWidth: '120px', padding: '14px', background: '#121214', border: '1px solid #323238', borderRadius: '6px', color: 'white' }}
            type="number"
            placeholder="R$ 0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select 
            style={{ flex: 1, minWidth: '120px', padding: '14px', background: '#121214', border: '1px solid #323238', borderRadius: '6px', color: 'white' }}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="income">Entrada</option>
            <option value="outcome">Saída</option>
          </select>
          <button style={{ padding: '0 25px', background: '#00b37e', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', transition: 'filter 0.2s' }}>
            <PlusCircle size={24} />
          </button>
        </form>

        {/* Tabela de Histórico */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#8d8d99', textAlign: 'left' }}>
                <th style={{ padding: '0 20px' }}>Descrição</th>
                <th style={{ padding: '0 20px' }}>Valor</th>
                <th style={{ padding: '0 20px' }}>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} style={{ background: '#29292e' }}>
                  <td style={{ padding: '16px 20px', borderRadius: '6px 0 0 6px' }}>{t.descricao}</td>
                  <td style={{ padding: '16px 20px', color: (t.tipo?.toLowerCase().includes('entrad') || t.tipo === 'income') ? '#00b37e' : '#f75a68', fontWeight: 'bold' }}>
                    {(t.tipo?.toLowerCase().includes('entrad') || t.tipo === 'income') ? '+ ' : '- '} 
                    R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#8d8d99' }}>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '16px 20px', borderRadius: '0 6px 6px 0', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(t.id)} style={{ background: 'transparent', border: 'none', color: '#f75a68', cursor: 'pointer' }}>
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default App;