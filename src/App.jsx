import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './index.css';

function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('smart_finance_data');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Exemplo: Salário', amount: 5000, type: 'income', category: 'Salário' },
    ];
  });

  // ESTADOS DO FORMULÁRIO
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');
  const [category, setCategory] = useState('Outros'); // <--- Isso evita a tela branca!

  useEffect(() => {
    localStorage.setItem('smart_finance_data', JSON.stringify(transactions));
  }, [transactions]);

  const totalIncomes = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalOutcomes = transactions
    .filter(t => t.type === 'outcome')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalBalance = totalIncomes - totalOutcomes;

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    const newTransaction = {
      id: Date.now(),
      title,
      amount: Number(amount),
      type,
      category // <--- Salvando a categoria
    };

    setTransactions([newTransaction, ...transactions]);
    setTitle('');
    setAmount('');
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800">
      <header className="max-w-4xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-emerald-700">Smart Finance</h1>
        <p className="text-gray-500 text-sm font-medium">Controle financeiro inteligente 🔒</p>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 mb-1 font-medium">Saldo Geral</p>
            <h2 className="text-2xl font-bold">R$ {totalBalance.toLocaleString('pt-BR')}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-emerald-600 mb-1 flex items-center gap-1 font-medium"><ArrowUpCircle size={18}/> Entradas</p>
            <h2 className="text-2xl font-bold text-emerald-600">R$ {totalIncomes.toLocaleString('pt-BR')}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-red-500 mb-1 flex items-center gap-1 font-medium"><ArrowDownCircle size={18}/> Saídas</p>
            <h2 className="text-2xl font-bold text-red-500">R$ {totalOutcomes.toLocaleString('pt-BR')}</h2>
          </div>
        </div>

        {/* GRÁFICO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider">Fluxo de Caixa</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Entradas', valor: totalIncomes }, { name: 'Saídas', valor: totalOutcomes }]}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="valor" radius={[8, 8, 8, 8]} barSize={50}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FORMULÁRIO COM CATEGORIA */}
        <form onSubmit={handleAddTransaction} className="bg-white p-6 rounded-2xl shadow-sm mb-8 flex flex-wrap gap-4 items-end border border-gray-100">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-bold text-gray-600 mb-1">Descrição</label>
            <input required className="w-full border border-gray-200 p-2 rounded-lg outline-emerald-500" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mercado..." />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-sm font-bold text-gray-600 mb-1">Valor</label>
            <input required type="number" className="w-full border border-gray-200 p-2 rounded-lg outline-emerald-500" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-sm font-bold text-gray-600 mb-1">Tipo</label>
            <select className="w-full border border-gray-200 p-2 rounded-lg bg-white" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="income">Entrada</option>
              <option value="outcome">Saída</option>
            </select>
          </div>
          <div className="w-full md:w-40">
            <label className="block text-sm font-bold text-gray-600 mb-1">Categoria</label>
            <select className="w-full border border-gray-200 p-2 rounded-lg bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Alimentação">🍕 Alimentação</option>
              <option value="Salário">💰 Salário</option>
              <option value="Lazer">🎡 Lazer</option>
              <option value="Saúde">🏥 Saúde</option>
              <option value="Transporte">🚗 Transporte</option>
              <option value="Outros">✨ Outros</option>
            </select>
          </div>
          <button className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2">
            <Plus size={20}/> Adicionar
          </button>
        </form>

        {/* LISTA COM CATEGORIA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="p-4 bg-gray-50 border-b font-bold text-gray-700 text-xs uppercase">Histórico</h3>
          <div className="divide-y divide-gray-100">
            {transactions.map(t => (
              <div key={t.id} className="flex justify-between items-center p-4">
                <div className="flex flex-col">
                  <span className="font-bold text-gray-800">{t.title}</span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                    {t.category || 'Outros'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={t.type === 'income' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                    R$ {t.amount.toLocaleString('pt-BR')}
                  </span>
                  <button onClick={() => deleteTransaction(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;