import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { supabase } from './supabaseClient';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro no App:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: '20px' }}>
          <div style={{ background: '#11131a', border: '1px solid #ff3860', borderRadius: '12px', padding: '24px', maxWidth: '420px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 10px', color: '#ff3860' }}>Erro na aplicação</h2>
            <p style={{ margin: 0, lineHeight: 1.6, color: '#ddd' }}>
              O sistema encontrou um problema ao renderizar. Recarregue a página e verifique os dados da operação.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [mensagemOperacao, setMensagemOperacao] = useState('');
  const [salvandoOperacao, setSalvandoOperacao] = useState(false);

  const obtenerDataLocal = () => {
    const d = new Date();
    const fuso = d.getTimezoneOffset() * 60000;
    return new Date(d - fuso).toISOString().split('T')[0];
  };

  const [data, setData] = useState(obtenerDataLocal());
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [anoRelatorio, setAnoRelatorio] = useState(new Date().getFullYear());
  const [visivel, setVisivel] = useState(true);
  const [mostrarPrivado, setMostrarPrivado] = useState(false);
  const [promptIA, setPromptIA] = useState('faça um relatório de cabos, películas, baterias e telas de iphone');
  const [respostaIA, setRespostaIA] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);

  const anosDisponiveis = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 3 + i);

  const meses = [
    { n: 1, nome: "JANEIRO" }, { n: 2, nome: "FEVEREIRO" }, { n: 3, nome: "MARÇO" },
    { n: 4, nome: "ABRIL" }, { n: 5, nome: "MAIO" }, { n: 6, nome: "JUNHO" },
    { n: 7, nome: "JULHO" }, { n: 8, nome: "AGOSTO" }, { n: 9, nome: "SETEMBRO" },
    { n: 10, nome: "OUTUBRO" }, { n: 11, nome: "NOVEMBRO" }, { n: 12, nome: "DEZEMBRO" }
  ];

  const normalizarTexto = (texto = '') =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

  const produtosFinanceiros = [
    { chave: 'bateria', rotulo: 'BATERIA', aliases: ['BATERIA', 'BATERIAS', 'BATTERY', 'BATERIA IPHONE'], custo: 55.0 },
    { chave: 'pelicula', rotulo: 'PELÍCULA', aliases: ['PELICULA', 'PELICULAS', 'PELÍCULA', 'PELÍCULAS', 'FILME', 'FILMES', 'FILM'], custo: 2.5 },
    { chave: 'carregador', rotulo: 'CARREGADOR', aliases: ['CARREGADOR', 'CARREGADORES', 'CHARGER', 'CARREGADOR USB'], custo: 5.5 },
    { chave: 'cabo', rotulo: 'CABO', aliases: ['CABO', 'CABOS', 'CABLE', 'CABLES', 'CABO USB', 'CABO DE CARGA'], custo: 2.5 },
    { chave: 'fone', rotulo: 'FONE', aliases: ['FONE', 'FONES', 'HEADSET', 'AURICULAR', 'AUS', 'EARPHONE', 'EARPHONES'], custo: 2.5 },
    { chave: 'suporte', rotulo: 'SUPORTE', aliases: ['SUPORTE', 'SUPORTES', 'SUPPORT'], custo: 15.0 },
    { chave: 'chip', rotulo: 'CHIP', aliases: ['CHIP', 'CHIPS', 'SIMCARD', 'SIM CARD'], custo: 10.0 },
    { chave: 'tela', rotulo: 'TELA', aliases: ['TELA', 'TELAS', 'DISPLAY', 'IPHONE', 'TELA IPHONE', 'TELA IPHONE 14', 'TELA IPHONE 15'], custo: 0 },
    { chave: 'capinha', rotulo: 'CAPINHA', aliases: ['CAPINHA', 'CAPINHAS', 'CASE', 'CASES'], custo: 0 },
    { chave: 'smartwatch', rotulo: 'SMARTWATCH', aliases: ['SMARTWATCH', 'RELÓGIO', 'WATCH'], custo: 0 },
    { chave: 'celular', rotulo: 'CELULAR', aliases: ['CELULAR', 'SMARTPHONE', 'SAMSUNG', 'XIAOMI', 'MOTOROLA'], custo: 0 },
    { chave: 'rezet', rotulo: 'REZET', aliases: ['REZET', 'REZETS', 'RESET'], custo: 0 }
  ];

  const extrairProdutoFinanceiro = (descricao = '') => {
    const textoNormalizado = normalizarTexto(descricao);
    const itensCorrespondentes = produtosFinanceiros
      .filter(item => item.aliases.some(alias => textoNormalizado.includes(alias)))
      .sort((a, b) => {
        const maiorA = Math.max(...a.aliases.map(alias => textoNormalizado.includes(alias) ? alias.length : 0));
        const maiorB = Math.max(...b.aliases.map(alias => textoNormalizado.includes(alias) ? alias.length : 0));
        return maiorB - maiorA;
      });

    if (itensCorrespondentes.length > 0) return itensCorrespondentes[0].rotulo;

    const match = textoNormalizado.match(/(BATERIA|PELICULA|CABO|CARREGADOR|FONE|TELA|CAPINHA|SUPORTE|CHIP|SMARTWATCH|CELULAR|REZET)/);
    return match ? match[1] : 'OUTROS';
  };

  const categoriasIA = [
    { chave: 'cabo', rotulo: 'CABOS', aliases: ['CABO', 'CABOS', 'CABLE', 'CABLES'] },
    { chave: 'pelicula', rotulo: 'PELÍCULAS', aliases: ['PELICULA', 'PELICULAS', 'PELÍCULA', 'PELÍCULAS', 'FILME', 'FILMES'] },
    { chave: 'bateria', rotulo: 'BATERIAS', aliases: ['BATERIA', 'BATERIAS', 'BATTERY'] },
    { chave: 'tela', rotulo: 'TELAS DE IPHONE', aliases: ['TELA', 'TELAS', 'TELA IPHONE', 'TELA DE IPHONE', 'DISPLAY', 'IPHONE'] }
  ];

  const extrairCategoriasIA = (texto = '') => {
    const textoNormalizado = normalizarTexto(texto);
    const categoriasEncontradas = categoriasIA.filter(item =>
      item.aliases.some(alias => textoNormalizado.includes(alias))
    );
    return categoriasEncontradas.length > 0 ? categoriasEncontradas : categoriasIA;
  };

  const extrairQuantidadeDescricao = (descricao = '') => {
    const texto = normalizarTexto(descricao);
    const match = texto.match(/(\d+)\s*(?:x|×)?\s*/);
    return match ? Number(match[1]) || 1 : 1;
  };

  const extrairPeriodoRelatorio = (texto = '') => {
    const txt = normalizarTexto(texto);
    if (txt.includes('ANO LETIVO') || txt.includes('ANUAL') || txt.includes('ANO')) return { tipo: 'ano', ano: anoRelatorio };
    if (txt.includes('HOJE') || txt.includes('DIA')) return { tipo: 'dia', data: data };
    if (txt.includes('TODOS') || txt.includes('GERAL') || txt.includes('COMPLETO') || txt.includes('TUDO')) return { tipo: 'todos' };
    return { tipo: 'mes', mes: mesFiltro, ano: anoRelatorio };
  };

  const calcularPeriodoAnterior = (periodo) => {
    if (periodo.tipo === 'mes') {
      const mesAnterior = periodo.mes === 1 ? 12 : periodo.mes - 1;
      const anoAnterior = periodo.mes === 1 ? periodo.ano - 1 : periodo.ano;
      return { tipo: 'mes', mes: mesAnterior, ano: anoAnterior };
    }
    if (periodo.tipo === 'ano') {
      return { tipo: 'ano', ano: periodo.ano - 1 };
    }
    if (periodo.tipo === 'dia') {
      const dataObj = new Date(periodo.data);
      dataObj.setDate(dataObj.getDate() - 1);
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      return { tipo: 'dia', data: `${ano}-${mes}-${dia}` };
    }
    return { tipo: 'todos' };
  };

  const filtrarPeriodo = (t, periodo) => {
    if (!t.data) return false;
    const [ano, mes, dia] = t.data.split('-');
    if (periodo.tipo === 'todos') return true;
    if (periodo.tipo === 'dia') return `${ano}-${mes}-${dia}` === periodo.data;
    if (periodo.tipo === 'mes') return Number(mes) === periodo.mes && Number(ano) === periodo.ano;
    if (periodo.tipo === 'ano') return Number(ano) === periodo.ano;
    return false;
  };

  const processarRelatorioIA = (textoPrompt) => {
    setCarregandoIA(true);

    const periodo = extrairPeriodoRelatorio(textoPrompt);
    const periodoAnterior = calcularPeriodoAnterior(periodo);
    const categoriasSolicitadas = extrairCategoriasIA(textoPrompt);

    const transacoesFiltradas = transacoes.filter(t => filtrarPeriodo(t, periodo));
    const transacoesAnterior = transacoes.filter(t => filtrarPeriodo(t, periodoAnterior));

    const periodoLabel = periodo.tipo === 'todos'
      ? 'todos os meses'
      : periodo.tipo === 'dia'
        ? `dia ${data.split('-').reverse().join('/')}`
        : periodo.tipo === 'ano'
          ? `ano letivo ${periodo.ano}`
          : `mês ${meses.find(item => item.n === periodo.mes)?.nome?.toLowerCase() || mesFiltro}`;

    const periodoAnteriorLabel = periodoAnterior.tipo === 'todos'
      ? 'todos os meses anteriores'
      : periodoAnterior.tipo === 'dia'
        ? `dia ${periodoAnterior.data.split('-').reverse().join('/')}`
        : periodoAnterior.tipo === 'ano'
          ? `ano letivo ${periodoAnterior.ano}`
          : `mês ${meses.find(item => item.n === periodoAnterior.mes)?.nome?.toLowerCase()}`;

    const itens = categoriasSolicitadas.map(categoria => {
      const correspondencias = transacoesFiltradas.filter(t => {
        const descricaoNormalizada = normalizarTexto(t.descricao || '');
        return categoria.aliases.some(alias => descricaoNormalizada.includes(alias));
      });

      const quantidade = correspondencias.reduce((soma, item) => soma + extrairQuantidadeDescricao(item.descricao), 0);
      const valorTotal = correspondencias.reduce((soma, item) => soma + parseValor(item.valor), 0);
      return { ...categoria, quantidade, valorTotal, transacoes: correspondencias.length };
    }).filter(item => item.quantidade > 0 || categoriasSolicitadas.length === categoriasIA.length);

    const valoresAnterior = categoriasSolicitadas.map(categoria => {
      const correspondencias = transacoesAnterior.filter(t => {
        const descricaoNormalizada = normalizarTexto(t.descricao || '');
        return categoria.aliases.some(alias => descricaoNormalizada.includes(alias));
      });
      return {
        categoria: categoria.rotulo,
        quantidade: correspondencias.reduce((soma, item) => soma + extrairQuantidadeDescricao(item.descricao), 0),
        valorTotal: correspondencias.reduce((soma, item) => soma + parseValor(item.valor), 0)
      };
    });

    const valorTotalGeral = itens.reduce((soma, item) => soma + item.valorTotal, 0);
    const quantidadeTotal = itens.reduce((soma, item) => soma + item.quantidade, 0);
    const valorTotalAnterior = valoresAnterior.reduce((soma, item) => soma + item.valorTotal, 0);
    const quantidadeTotalAnterior = valoresAnterior.reduce((soma, item) => soma + item.quantidade, 0);
    const percentualValor = valorTotalAnterior === 0 ? null : ((valorTotalGeral - valorTotalAnterior) / valorTotalAnterior) * 100;
    const percentualQuantidade = quantidadeTotalAnterior === 0 ? null : ((quantidadeTotal - quantidadeTotalAnterior) / quantidadeTotalAnterior) * 100;

    const verbo = textoPrompt.toLowerCase().includes('troca') || textoPrompt.toLowerCase().includes('troc')
      ? 'trocados'
      : textoPrompt.toLowerCase().includes('vend')
        ? 'vendidos'
        : 'registrados';

    const formatarReal = (numero) =>
      numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatarPercentual = (numero) => `${numero >= 0 ? '+' : ''}${numero.toFixed(1)}%`;

    const linhas = itens.map(item => {
      const quantidade = item.quantidade;
      const total = formatarReal(item.valorTotal);
      return `- ${item.rotulo}: ${quantidade} ${verbo} | Total em valor: R$ ${total}`;
    });

    const comparativo = valorTotalAnterior || quantidadeTotalAnterior
      ? `Comparativo com ${periodoAnteriorLabel}: ${quantidadeTotalAnterior} itens | Valor anterior: R$ ${formatarReal(valorTotalAnterior)} | ` +
        `Variação quantidade: ${quantidadeTotalAnterior === 0 ? 'N/A' : formatarPercentual(percentualQuantidade)} | ` +
        `Variação valor: ${valorTotalAnterior === 0 ? 'N/A' : formatarPercentual(percentualValor)}`
      : `Sem dados do período anterior (${periodoAnteriorLabel}) para comparação.`;

    const resposta = itens.length > 0
      ? `RELATÓRIO PROFISSIONAL - ${periodoLabel.toUpperCase()}\n` +
        `────────────────────────────────────────\n` +
        `${linhas.join('\n')}\n` +
        `────────────────────────────────────────\n` +
        `Totais: ${quantidadeTotal} itens | Valor total: R$ ${formatarReal(valorTotalGeral)}\n` +
        `Comparativo anterior: ${comparativo}`
      : 'Nenhum item encontrado com os termos informados. Tente usar palavras como cabo, película, bateria ou tela de iphone e verifique o ano ou mês selecionado.';

    setRespostaIA(resposta);
    setCarregandoIA(false);
  };

  const gerarRelatorioIA = (e) => {
    e?.preventDefault?.();
    processarRelatorioIA(promptIA);
  };

  const limparRelatorioIA = () => {
    setRespostaIA('');
    setPromptIA('');
  };

  const ehCombustivel = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["GASOLINA", "POSTO", "COMBUSTIVEL", "ETANOL", "DIESEL"].some(item => desc.includes(item));
  };

  const ehMercado = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["MERCADO", "SUPERMERCADO", "COMPRAS", "MERCADINHO", "ATACADAO", "ASSAI"].some(item => desc.includes(item));
  };

  const ehLazer = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["CINEMA", "RESTAURANTE", "PIZZA", "BAR", "LAZER", "DIVERSAO", "JOGO", "SHOW", "EVENTO"].some(item => desc.includes(item));
  };

  const ehAluguel = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["ALUGUEL", "ALUGA"].some(item => desc.includes(item));
  };

  const ehLuz = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["ENERGIA", "LUZ", "ELETRICIDADE", "ELETRICA"].some(item => desc.includes(item));
  };

  const ehAgua = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["AGUA", "SANEAMENTO", "HIDRICA"].some(item => desc.includes(item));
  };

  const ehDiversos = (descricao = '') => {
    const desc = normalizarTexto(descricao);
    return ["DIVERSOS", "OUTROS", "MISC", "OUTROS GASTOS"].some(item => desc.includes(item));
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

  const normalizarData = (valorData) => String(valorData ?? '').slice(0, 10);

  const obterCategoriaTransacao = (tipo = '', descricao = '') => {
    const tipoNormalizado = normalizarTexto(tipo);

    if (tipoNormalizado.includes('ENTRADA')) return 'entrada';
    if (tipoNormalizado.includes('COMBUST')) return 'combustivel';
    if (tipoNormalizado.includes('MERCAD') || tipoNormalizado.includes('SUPERMERC')) return 'mercado';
    if (tipoNormalizado.includes('LAZER')) return 'lazer';
    if (tipoNormalizado.includes('ALUGUEL')) return 'aluguel';
    if (tipoNormalizado.includes('LUZ')) return 'luz';
    if (tipoNormalizado.includes('AGUA')) return 'agua';
    if (tipoNormalizado.includes('DIVERSO')) return 'diversos';
    if (tipoNormalizado.includes('SAIDA') || tipoNormalizado.includes('DESPESA')) return 'saida';
    if (ehCombustivel(descricao)) return 'combustivel';
    if (ehMercado(descricao)) return 'mercado';
    if (ehLazer(descricao)) return 'lazer';
    if (ehAluguel(descricao)) return 'aluguel';
    if (ehLuz(descricao)) return 'luz';
    if (ehAgua(descricao)) return 'agua';
    if (ehDiversos(descricao)) return 'diversos';

    return 'saida';
  };

  const calcularTotaisPorMes = () => {
    const acumulado = meses.reduce((acc, mes) => {
      acc[mes.n] = { mes: mes.nome, numero: mes.n, entrada: 0, saida: 0 };
      return acc;
    }, {});

    transacoes.forEach(t => {
      const valorTransacao = parseValor(t.valor);
      const dataTransacao = t.data ? new Date(t.data) : null;
      const mesTransacao = dataTransacao && !isNaN(dataTransacao.getTime()) ? dataTransacao.getMonth() + 1 : 0;
      const categoria = obterCategoriaTransacao(t.tipo, t.descricao);
      const isEntrada = categoria === 'entrada';
      const isSaida = categoria === 'saida' || categoria === 'combustivel' || categoria === 'mercado';

      if (!acumulado[mesTransacao]) return;
      if (isEntrada) acumulado[mesTransacao].entrada += valorTransacao;
      if (isSaida) acumulado[mesTransacao].saida += valorTransacao;
    });

    const valores = Object.values(acumulado).sort((a, b) => a.numero - b.numero);
    const maiorEntrada = valores.reduce((best, item) => item.entrada > best.entrada ? item : best, { mes: '', numero: 0, entrada: 0, saida: 0 });
    const maiorSaida = valores.reduce((best, item) => item.saida > best.saida ? item : best, { mes: '', numero: 0, entrada: 0, saida: 0 });

    return { valores, maiorEntrada, maiorSaida };
  };

  const totaisPorMes = useMemo(calcularTotaisPorMes, [transacoes]);
  const mesesComDados = useMemo(
    () => totaisPorMes.valores.filter(item => item.entrada > 0 || item.saida > 0),
    [totaisPorMes]
  );

  const buildRankingPorPeriodo = (mesReferencia, anoReferencia) => {
    const produtos = new Map();

    transacoes.forEach((transacao) => {
      const dataTransacao = transacao.data ? transacao.data.split('-') : null;
      if (!dataTransacao || Number(dataTransacao[1]) !== mesReferencia || Number(dataTransacao[0]) !== anoReferencia) return;

      const produto = extrairProdutoFinanceiro(transacao.descricao || '');
      if (!produto || produto === 'OUTROS') return;

      const item = produtos.get(produto) || {
        produto,
        quantidadeVendida: 0,
        faturamento: 0,
        custo: 0,
        lucro: 0,
        margem: 0,
      };

      const valor = parseValor(transacao.valor);
      const quantidade = extrairQuantidadeDescricao(transacao.descricao || '');
      const produtoInfo = produtosFinanceiros.find(p => p.rotulo === produto);
      const custoPadrao = produtoInfo?.custo ?? 0;

      if (transacao.tipo === 'entrada') {
        item.quantidadeVendida += quantidade;
        item.faturamento += valor;
        item.custo += custoPadrao > 0 ? custoPadrao * quantidade : 0;
      } else if (produtoInfo && produtoInfo.custo > 0) {
        item.custo += custoPadrao * quantidade;
      } else {
        item.custo += valor;
      }

      produtos.set(produto, item);
    });

    return Array.from(produtos.values())
      .map((item) => ({
        ...item,
        lucro: item.faturamento - item.custo,
        margem: item.faturamento > 0 ? ((item.faturamento - item.custo) / item.faturamento) * 100 : 0,
      }))
      .sort((a, b) => b.lucro - a.lucro || b.faturamento - a.faturamento)
      .map((item, index) => ({
        ...item,
        posicao: index + 1,
        decisao: item.lucro > 0 ? (item.margem >= 30 ? 'VENDER MAIS' : 'MANTER') : 'PARAR DE COMPRAR',
      }));
  };

  const mesAnteriorInfo = useMemo(() => {
    const mesAnterior = mesFiltro === 1 ? 12 : mesFiltro - 1;
    const anoAnterior = mesFiltro === 1 ? anoRelatorio - 1 : anoRelatorio;
    return { mes: mesAnterior, ano: anoAnterior };
  }, [mesFiltro, anoRelatorio]);

  const rankingMensal = useMemo(
    () => buildRankingPorPeriodo(mesFiltro, anoRelatorio),
    [transacoes, mesFiltro, anoRelatorio]
  );

  const rankingMesAnterior = useMemo(
    () => buildRankingPorPeriodo(mesAnteriorInfo.mes, mesAnteriorInfo.ano),
    [transacoes, mesAnteriorInfo]
  );

  const melhorProdutoMes = rankingMensal[0];
  const piorProdutoMes = [...rankingMensal].sort((a, b) => a.margem - b.margem)[0];
  const totalFaturamentoMes = rankingMensal.reduce((soma, item) => soma + item.faturamento, 0);
  const totalCustoMes = rankingMensal.reduce((soma, item) => soma + item.custo, 0);
  const totalLucroMes = totalFaturamentoMes - totalCustoMes;
  const totalFaturamentoMesAnterior = rankingMesAnterior.reduce((soma, item) => soma + item.faturamento, 0);
  const variacaoFaturamento = totalFaturamentoMesAnterior === 0
    ? null
    : ((totalFaturamentoMes - totalFaturamentoMesAnterior) / totalFaturamentoMesAnterior) * 100;

  // --- LÓGICA DE SESSÃO ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const buscarDados = async () => {
    const { data: dataDb, error } = await supabase.from('transacoes').select('*').order('data', { ascending: true });
    if (error) {
      console.error('Erro ao carregar transações:', error);
      alert(`Não foi possível carregar as transações: ${error.message}`);
      return;
    }
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
      const { error } = await supabase.from('transacoes').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir transação:', error);
        alert(`Não foi possível excluir a transação: ${error.message}`);
        return;
      }
      buscarDados();
    }
  };

  // --- CÁLCULOS E INTELIGÊNCIA ---
  const resumo = useMemo(() => {
    let totalEntradasMes = 0, totalSaidasMes = 0, entDia = 0, saiDia = 0, totalCombustivel = 0, totalMercado = 0;
    let totalLazer = 0, totalAluguel = 0, totalLuz = 0, totalAgua = 0, totalDiversos = 0;
    let acumuladoEntradasAte27 = 0, acumuladoSaidasAte27 = 0, acumuladoCombustivelAte27 = 0, acumuladoMercadoAte27 = 0;
    let acumuladoEntradasAte31 = 0, acumuladoSaidasAte31 = 0, acumuladoCombustivelAte31 = 0, acumuladoMercadoAte31 = 0;

    transacoes.forEach(t => {
      const v = parseValor(t.valor);
      const dataTransacao = normalizarData(t.data);
      const [anoTransacao, mesTransacao, diaTransacao] = dataTransacao.split('-');
      const dFormatada = dataTransacao;
      const mTrans = parseInt(mesTransacao, 10) || 0;
      const anoTrans = parseInt(anoTransacao, 10) || 0;
      const diaNumero = parseInt(diaTransacao, 10) || 0;
      const categoria = obterCategoriaTransacao(t.tipo, t.descricao);
      const isEntrada = categoria === 'entrada';
      const isSaida = categoria !== 'entrada';
      const isCombustivel = categoria === 'combustivel' || ehCombustivel(t.descricao);
      const isMercado = categoria === 'mercado' || ehMercado(t.descricao);
      const isLazer = categoria === 'lazer';
      const isAluguel = categoria === 'aluguel';
      const isLuz = categoria === 'luz';
      const isAgua = categoria === 'agua';
      const isDiversos = categoria === 'diversos';

      if (mTrans === mesFiltro && anoTrans === anoRelatorio) {
        if (isEntrada) totalEntradasMes += v;
        if (isSaida) totalSaidasMes += v;
        if (isCombustivel) totalCombustivel += v;
        if (isMercado) totalMercado += v;
        if (isLazer) totalLazer += v;
        if (isAluguel) totalAluguel += v;
        if (isLuz) totalLuz += v;
        if (isAgua) totalAgua += v;
        if (isDiversos) totalDiversos += v;

        if (diaNumero <= 27) {
          if (isEntrada) acumuladoEntradasAte27 += v;
          if (isSaida) acumuladoSaidasAte27 += v;
          if (isCombustivel) acumuladoCombustivelAte27 += v;
          if (isMercado) acumuladoMercadoAte27 += v;
        }

        if (diaNumero <= 31) {
          if (isEntrada) acumuladoEntradasAte31 += v;
          if (isSaida) acumuladoSaidasAte31 += v;
          if (isCombustivel) acumuladoCombustivelAte31 += v;
          if (isMercado) acumuladoMercadoAte31 += v;
        }
      }

      if (dFormatada === data) {
        if (isEntrada) entDia += v;
        else saiDia += v;
      }
    });

    return { ent: totalEntradasMes, sai: totalSaidasMes, lista: transacoes, entDia, saiDia, totalCombustivel, totalMercado, totalLazer, totalAluguel, totalLuz, totalAgua, totalDiversos, acumuladoEntradasAte27, acumuladoSaidasAte27, acumuladoCombustivelAte27, acumuladoMercadoAte27, acumuladoEntradasAte31, acumuladoSaidasAte31, acumuladoCombustivelAte31, acumuladoMercadoAte31 };
  }, [transacoes, mesFiltro, anoRelatorio, data]);

  // --- GRÁFICO AGRUPADO POR DIA ---
  const dadosGrafico = useMemo(() => {
    const agrupado = {};

    transacoes
      .filter(t => {
        const dataTransacao = normalizarData(t.data);
        const [anoTransacao, mesTransacao] = dataTransacao.split('-');
        return Number(mesTransacao) === mesFiltro && Number(anoTransacao) === anoRelatorio;
      })
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

  const metaMensal = 12000;
  const analiseMensal = useMemo(() => {
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), mesFiltro, 0).getDate();
    const esperado = diasNoMes ? (metaMensal / diasNoMes) * diaHoje : 0;
    const atual = resumo.ent;
    const percentual = esperado ? (atual / esperado) * 100 : 0;
    const pct = Number(percentual.toFixed(1));
    const gap = Number(Math.abs(100 - percentual).toFixed(1));
    let status = 'ABAIXO da média';
    if (percentual >= 100) status = `ACIMA da média (+${gap}%)`;
    else if (percentual >= 90) status = `NA MÉDIA (${pct}%)`;
    const proximoCheckpoint = [10, 20, 30].find(d => d > diaHoje) ?? 30;
    const aviso = [10, 20, 30].includes(diaHoje) ? `AVALIAÇÃO DIA ${diaHoje}` : `Próxima avaliação: dia ${proximoCheckpoint}`;
    return { diaHoje, esperado, entrado: atual, percentual: pct, status, aviso };
  }, [resumo.ent, mesFiltro]);

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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setVisivel(!visivel)} style={{ background: 'none', border: '1px solid #00d1b2', color: '#00d1b2', cursor: 'pointer', borderRadius: '5px', padding: '5px 10px' }}>{visivel ? '👁️' : '🙈'}</button>
            <button onClick={() => setMostrarPrivado(prev => !prev)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', borderRadius: '5px', padding: '5px 8px', fontSize: '0.8rem', textDecoration: 'underline dotted' }}>
              {mostrarPrivado ? '◄ ocultar' : 'relatório'}
            </button>
            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #ff3860', color: '#ff3860', cursor: 'pointer', borderRadius: '5px', padding: '5px 10px' }}>SAIR</button>
            <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} style={{ backgroundColor: '#000', color: '#00d1b2', border: '1px solid #00d1b2' }}>
              {meses.map(m => <option key={m.n} value={m.n}>{m.nome}</option>)}
            </select>
          </div>
        </header>

        {/* --- ASSISTENTE IA --- */}
        <div style={{ backgroundColor: '#11131a', padding: '20px', borderRadius: '15px', border: '1px solid #2f6fed', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ color: '#7ec8ff', margin: '0 0 6px', fontSize: '1.05rem' }}>Assistente IA do financeiro</h3>

            </div>
            <span style={{ color: '#7ec8ff', fontSize: '0.85rem' }}>IA LOCAL • PORTUGUÊS</span>
          </div>

          <form onSubmit={gerarRelatorioIA} style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
            <select
              value={anoRelatorio}
              onChange={e => setAnoRelatorio(Number(e.target.value))}
              style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #2f6fed', color: '#fff', borderRadius: '8px' }}
            >
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
            <input
              type="text"
              value={promptIA}
              onChange={e => setPromptIA(e.target.value)}
              placeholder="Digite sua pergunta para a IA, por exemplo: quantos cabos foram vendidos no ano letivo"
              style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #2f6fed', color: '#fff', borderRadius: '8px' }}
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => {
                const texto = 'faça um relatório anual de cabos, películas, baterias e telas de iphone';
                setPromptIA(texto);
                processarRelatorioIA(texto);
              }} style={{ flex: '1 1 160px', minWidth: '160px', padding: '12px', backgroundColor: '#22c55e', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#000', fontWeight: 'bold' }}>
                RELATÓRIO ANUAL
              </button>
              <button type="button" onClick={() => {
                const texto = 'faça um relatório do mês de cabos, películas, baterias e telas de iphone';
                setPromptIA(texto);
                processarRelatorioIA(texto);
              }} style={{ flex: '1 1 160px', minWidth: '160px', padding: '12px', backgroundColor: '#2563eb', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}>
                RELATÓRIO MENSAL
              </button>
              <button type="button" onClick={limparRelatorioIA} style={{ flex: '1 1 160px', minWidth: '160px', padding: '12px', backgroundColor: '#ff3860', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}>
                LIMPAR RELATÓRIO
              </button>
            </div>
            <button type="submit" disabled={carregandoIA} style={{ padding: '12px', backgroundColor: '#2f6fed', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}>
              {carregandoIA ? 'GERANDO RELATÓRIO...' : 'GERAR RELATÓRIO'}
            </button>
          </form>

          {respostaIA && (
            <div style={{ marginTop: '14px', padding: '14px', backgroundColor: '#0c1322', borderRadius: '10px', border: '1px solid #274d80', color: '#dceeff', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {respostaIA}
            </div>
          )}
        </div>

        {/* --- CARDS DE GASTOS ESPECÍFICOS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #f39c12' }}>
            <small style={{ color: '#888' }}>⛽ COMBUSTÍVEL</small>
            <h3 style={{ margin: '5px 0', color: '#f39c12' }}>R$ {Mascarar(resumo.totalCombustivel.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #3498db' }}>
            <small style={{ color: '#888' }}>🛒 MERCADO</small>
            <h3 style={{ margin: '5px 0', color: '#3498db' }}>R$ {Mascarar(resumo.totalMercado.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #9b59b6' }}>
            <small style={{ color: '#888' }}>🎬 LAZER</small>
            <h3 style={{ margin: '5px 0', color: '#9b59b6' }}>R$ {Mascarar(resumo.totalLazer.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #9edae4' }}>
            <small style={{ color: '#888' }}>🏠 ALUGUEL</small>
            <h3 style={{ margin: '5px 0', color: '#9edae4' }}>R$ {Mascarar(resumo.totalAluguel.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #f1c40f' }}>
            <small style={{ color: '#888' }}>💡 LUZ</small>
            <h3 style={{ margin: '5px 0', color: '#f1c40f' }}>R$ {Mascarar(resumo.totalLuz.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #3498db' }}>
            <small style={{ color: '#888' }}>💧 ÁGUA</small>
            <h3 style={{ margin: '5px 0', color: '#3498db' }}>R$ {Mascarar(resumo.totalAgua.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #7f8c8d' }}>
            <small style={{ color: '#888' }}>... DIVERSOS</small>
            <h3 style={{ margin: '5px 0', color: '#7f8c8d' }}>R$ {Mascarar(resumo.totalDiversos.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #9b59b6' }}>
            <small style={{ color: '#888' }}>📥 ENTRADA</small>
            <h3 style={{ margin: '5px 0', color: '#9b59b6' }}>R$ {Mascarar(resumo.acumuladoEntradasAte31.toFixed(2))}</h3>
          </div>
          <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #e74c3c' }}>
            <small style={{ color: '#888' }}>📤 SAÍDA</small>
            <h3 style={{ margin: '5px 0', color: '#e74c3c' }}>R$ {Mascarar(resumo.acumuladoSaidasAte31.toFixed(2))}</h3>
          </div>
        </div>

        {mostrarPrivado && (
          <div style={{ backgroundColor: '#11131a', padding: '20px', borderRadius: '15px', border: '1px solid #444', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ color: '#ffcc00', margin: '0 0 8px', fontSize: '1.1rem' }}>Relatório Privado - Comparativo Mensal</h3>
              </div>
              <span style={{ color: '#bbb', fontSize: '0.9rem' }}>Acesso discreto, somente cliente</span>
            </div>

            <div style={{ marginTop: '18px', color: '#ddd', lineHeight: 1.6 }}>
              {mesesComDados.length === 0 ? (
                <p style={{ margin: 0, color: '#888' }}>Nenhum mês com valores registrados ainda.</p>
              ) : (
                mesesComDados.map(item => (
                  <p key={item.numero} style={{ margin: '6px 0', color: '#ccc' }}>
                    Mês de <strong>{item.mes.toLowerCase()}</strong> faz <strong style={{ color: '#00d1b2' }}>entrada R$ {item.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> e <strong style={{ color: '#ff3860' }}>saída R$ {item.saida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.
                  </p>
                ))
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '18px' }}>
              {mesesComDados.map(item => (
                <div key={item.numero} style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '12px', border: '1px solid #333' }}>
                  <strong style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>{item.mes}</strong>
                  <p style={{ margin: '0 0 6px', color: '#00d1b2' }}>Entrada: R$ {item.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p style={{ margin: 0, color: '#ff3860' }}>Saída: R$ {item.saida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '22px', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mesesComDados} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="mes" stroke="#888" style={{ fontSize: '0.8rem' }} />
                  <YAxis stroke="#888" style={{ fontSize: '0.8rem' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffcc00', borderRadius: '8px', color: '#fff' }} formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Legend wrapperStyle={{ color: '#ccc', fontSize: '0.9rem' }} />
                  <Bar dataKey="entrada" name="Entrada" fill="#00d1b2" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="saida" name="Saída" fill="#ff3860" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* --- CARDS DE METAS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          
          {/* META DIÁRIA R$ 400 */}
          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #00d1b2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#00d1b2', fontWeight: 'bold' }}>PROGRESSO DIÁRIO (R$ 400)</small>
              <small style={{ color: '#00d1b2' }}>{((resumo.entDia / 400) * 100).toFixed(0)}%</small>
            </div>
            <div style={{ margin: '10px 0' }}>
              <p style={{ margin: '0 0 5px', color: '#e0e0e0', fontSize: '1rem' }}>Entrada diária</p>
              <h2 style={{ color: '#00d1b2', margin: 0 }}>R$ {Mascarar(resumo.entDia.toFixed(2))}</h2>
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
              <small style={{ color: '#00d1b2', fontWeight: 'bold' }}>META MENSAL (R$ 12.000)</small>
              <small style={{ color: '#00d1b2' }}>{((resumo.ent / 12000) * 100).toFixed(1)}%</small>
            </div>
            <div style={{ width: '100%', backgroundColor: '#333', height: '12px', borderRadius: '6px', margin: '10px 0', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((resumo.ent / 12000) * 100, 100)}%`, height: '100%', backgroundColor: '#00d1b2', boxShadow: '0 0 10px #00d1b2', transition: 'width 0.5s' }} />
            </div>
            <h2 style={{ color: '#00d1b2', margin: '0' }}>R$ {Mascarar(resumo.ent.toLocaleString('pt-BR'))}</h2>
          </div>

          <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '1px solid #00d1b2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#00d1b2', fontWeight: 'bold' }}>CHECK MENSAL</small>
              <small style={{ color: '#00d1b2' }}>{analiseMensal.aviso}</small>
            </div>
            <div style={{ margin: '10px 0' }}>
              <p style={{ margin: '0 0 5px', color: '#e0e0e0', fontSize: '1rem' }}>Entrada acumulada</p>
              <h2 style={{ color: '#00d1b2', margin: 0 }}>R$ {Mascarar(analiseMensal.entrado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</h2>
            </div>
            <p style={{ color: analiseMensal.percentual >= 100 ? '#2ecc71' : analiseMensal.percentual >= 90 ? '#f1c40f' : '#e74c3c', margin: '0 0 8px' }}>
              {analiseMensal.status}
            </p>
            <small style={{ color: '#bbb' }}>
              Esperado até hoje: R$ {analiseMensal.esperado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({analiseMensal.percentual.toFixed(1)}% do esperado).
            </small>
          </div>

          {/* METAS BATIDAS - EFEITO PISCA */}
          {resumo.entDia >= 400 && resumo.ent >= 12000 && (
            <div className="piscar" style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '10px', border: '2px solid #00ff00', textAlign: 'center', gridColumn: 'span 2' }}>
              <h2 style={{ color: '#00ff00', margin: '10px 0', fontSize: '1.8rem', textShadow: '0 0 15px #00ff00' }}>🎉 PARABÉNS!</h2>
              <small style={{ color: '#00ff00', fontWeight: 'bold' }}>AMBAS AS METAS FORAM ATINGIDAS!</small>
              <p style={{ color: '#00ff00', margin: '10px 0', fontSize: '0.9rem' }}>✓ Meta Diária Batida ✓ Meta Mensal Batida</p>
            </div>
          )}
        </div>

        {/* --- RESUMO EXECUTIVO DO MÊS --- */}
        <div style={{ backgroundColor: '#11131a', padding: '20px', borderRadius: '15px', border: '1px solid #274d80', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px', color: '#7ec8ff', fontSize: '1.1rem' }}>Resumo executivo do mês</h3>
              <small style={{ color: '#a9c5df' }}>Faturamento real • custo • lucro • margem comparativa</small>
            </div>
            <div style={{ color: '#dceeff', fontSize: '0.85rem', padding: '8px 12px', borderRadius: '999px', backgroundColor: '#0c1322', border: '1px solid #2f6fed' }}>
              {variacaoFaturamento === null ? 'Sem comparação anterior' : `${variacaoFaturamento >= 0 ? '+' : ''}${variacaoFaturamento.toFixed(1)}% vs mês anterior`}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
            <div style={{ backgroundColor: '#0c1322', border: '1px solid #2f6fed', borderRadius: '10px', padding: '12px' }}>
              <small style={{ color: '#7ec8ff' }}>FATURAMENTO</small>
              <h4 style={{ margin: '8px 0 0', color: '#00d1b2' }}>R$ {totalFaturamentoMes.toFixed(2)}</h4>
            </div>
            <div style={{ backgroundColor: '#0c1322', border: '1px solid #ff3860', borderRadius: '10px', padding: '12px' }}>
              <small style={{ color: '#ff9aa9' }}>CUSTO</small>
              <h4 style={{ margin: '8px 0 0', color: '#ff9aa9' }}>R$ {totalCustoMes.toFixed(2)}</h4>
            </div>
            <div style={{ backgroundColor: '#0c1322', border: '1px solid #00d1b2', borderRadius: '10px', padding: '12px' }}>
              <small style={{ color: '#7ec8ff' }}>LUCRO</small>
              <h4 style={{ margin: '8px 0 0', color: totalLucroMes >= 0 ? '#00d1b2' : '#ff3860' }}>R$ {totalLucroMes.toFixed(2)}</h4>
            </div>
            <div style={{ backgroundColor: '#0c1322', border: '1px solid #f1c40f', borderRadius: '10px', padding: '12px' }}>
              <small style={{ color: '#f1c40f' }}>MARGEM</small>
              <h4 style={{ margin: '8px 0 0', color: totalFaturamentoMes > 0 ? '#f1c40f' : '#8ea8c8' }}>{totalFaturamentoMes > 0 ? `${((totalLucroMes / totalFaturamentoMes) * 100).toFixed(1)}%` : '0.0%'}</h4>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
            <div style={{ backgroundColor: '#0c1322', border: '1px solid #2f6fed', borderRadius: '10px', padding: '12px' }}>
              <small style={{ color: '#7ec8ff' }}>PRODUTO COM MAIS LUCRO</small>
              <h4 style={{ margin: '8px 0 0', color: '#dceeff' }}>{melhorProdutoMes ? melhorProdutoMes.produto : 'N/A'}</h4>
            </div>
            <div style={{ backgroundColor: '#0c1322', border: '1px solid #ff3860', borderRadius: '10px', padding: '12px' }}>
              <small style={{ color: '#ff9aa9' }}>ATENÇÃO</small>
              <h4 style={{ margin: '8px 0 0', color: '#dceeff' }}>{piorProdutoMes ? piorProdutoMes.produto : 'N/A'}</h4>
            </div>
          </div>
        </div>

        {/* --- RANKING MENSAL DE PRODUTOS --- */}
        <div style={{ backgroundColor: '#11131a', padding: '20px', borderRadius: '15px', border: '1px solid #274d80', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px', color: '#7ec8ff', fontSize: '1.1rem' }}>Ranking mensal de produtos</h3>
              <small style={{ color: '#a9c5df' }}>Quantidade vendida • faturamento • custo • lucro • margem</small>
            </div>
            <div style={{ color: '#dceeff', fontSize: '0.85rem', padding: '8px 12px', borderRadius: '999px', backgroundColor: '#0c1322', border: '1px solid #2f6fed' }}>
              {melhorProdutoMes ? `Top: ${melhorProdutoMes.produto} · Lucro R$ ${melhorProdutoMes.lucro.toFixed(2)}` : 'Sem dados do mês'}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', color: '#e5f1ff' }}>
              <thead>
                <tr style={{ backgroundColor: '#0c1322', color: '#7ec8ff' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>PRODUTO</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>QTD</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>FATURAMENTO</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>CUSTO</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>LUCRO</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>MARGEM</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {rankingMensal.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '18px', textAlign: 'center', color: '#8ea8c8' }}>Nenhum produto encontrado para este mês.</td>
                  </tr>
                ) : (
                  rankingMensal.map((item) => (
                    <tr key={item.produto} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px', color: '#7ec8ff' }}>{item.posicao}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.produto}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantidadeVendida}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#00d1b2' }}>R$ {item.faturamento.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#ff9aa9' }}>R$ {item.custo.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: item.lucro >= 0 ? '#00d1b2' : '#ff3860', fontWeight: 'bold' }}>R$ {item.lucro.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: item.margem >= 0 ? '#7ec8ff' : '#ff9aa9', fontWeight: 'bold' }}>{item.margem.toFixed(1)}%</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: item.decisao === 'VENDER MAIS' ? '#00d1b2' : item.decisao === 'MANTER' ? '#f1c40f' : '#ff3860', fontWeight: 'bold' }}>{item.decisao}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
        <div style={{ backgroundColor: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)', padding: '25px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px', height: '350px', minWidth: 0, boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}>
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
          <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
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
              setMensagemOperacao('');
              const val = parseValor(valor);
              if (!Number.isFinite(val) || val <= 0) {
                setMensagemOperacao('Informe um valor maior que zero.');
                return;
              }
              setSalvandoOperacao(true);
              try {
                const { data: transacaoSalva, error } = await supabase
                  .from('transacoes')
                  .insert([{ descricao: descricao.toUpperCase(), valor: val, tipo, data }])
                  .select()
                  .single();
                if (error) {
                  console.error('Erro ao salvar transação:', error);
                  setMensagemOperacao(`Erro do Supabase: ${error.message}`);
                  return;
                }
                setMensagemOperacao('Operação registrada com sucesso.');
                if (transacaoSalva) setTransacoes(transacoesAtuais => [...transacoesAtuais, transacaoSalva]);
                setDescricao('');
                setValor('');
              } catch (error) {
                console.error('Erro inesperado ao salvar transação:', error);
                setMensagemOperacao(`Erro de conexão: ${error.message}`);
              } finally {
                setSalvandoOperacao(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="DESCRIÇÃO" value={descricao} onChange={e => setDescricao(e.target.value)} required style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }}>
                <option value="entrada">ENTRADA (+)</option>
                <option value="saida">SAÍDA (-)</option>
                <option value="combustivel">COMBUSTÍVEL (⛽)</option>
                <option value="mercado">MERCADO (🛒)</option>
                <option value="lazer">LAZER (🎬)</option>
                <option value="aluguel">ALUGUEL (🏠)</option>
                <option value="luz">LUZ (💡)</option>
                <option value="agua">ÁGUA (💧)</option>
                <option value="diversos">DIVERSOS (...)</option>
              </select>
              <input type="text" placeholder="VALOR R$" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
              <button type="submit" disabled={salvandoOperacao} style={{ padding: '14px', backgroundColor: '#00d1b2', border: 'none', cursor: salvandoOperacao ? 'wait' : 'pointer', fontWeight: 'bold', borderRadius: '5px', color: '#000' }}>{salvandoOperacao ? 'SALVANDO...' : 'EXECUTAR'}</button>
              {mensagemOperacao && <small style={{ color: mensagemOperacao.startsWith('Erro') || mensagemOperacao.startsWith('Informe') ? '#ff9aa9' : '#00d1b2' }}>{mensagemOperacao}</small>}
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
    </div>
  );
  
};

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}