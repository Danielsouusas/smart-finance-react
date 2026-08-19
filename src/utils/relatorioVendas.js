const MESES = [
  { n: 1, nome: 'JANEIRO' },
  { n: 2, nome: 'FEVEREIRO' },
  { n: 3, nome: 'MARÇO' },
  { n: 4, nome: 'ABRIL' },
  { n: 5, nome: 'MAIO' },
  { n: 6, nome: 'JUNHO' },
  { n: 7, nome: 'JULHO' },
  { n: 8, nome: 'AGOSTO' },
  { n: 9, nome: 'SETEMBRO' },
  { n: 10, nome: 'OUTUBRO' },
  { n: 11, nome: 'NOVEMBRO' },
  { n: 12, nome: 'DEZEMBRO' },
];

const MES_POR_NOME = Object.fromEntries(MESES.map((mes) => [normalizarTexto(mes.nome), mes.n]));

const ITENS_IA = [
  { chave: 'cabo', rotulo: 'CABO', aliases: ['CABO', 'CABOS', 'CABLE', 'CABLES', 'CABO USB', 'CABO DE CARGA'] },
  { chave: 'pelicula', rotulo: 'PELÍCULA', aliases: ['PELICULA', 'PELICULAS', 'PELÍCULA', 'PELÍCULAS', 'FILME', 'FILMES', 'FILM'] },
  { chave: 'bateria', rotulo: 'BATERIA', aliases: ['BATERIA', 'BATERIAS', 'BATTERY', 'BATERIA IPHONE'] },
  { chave: 'tela', rotulo: 'TELA DE IPHONE', aliases: ['TELA', 'TELAS', 'DISPLAY', 'IPHONE', 'TELA IPHONE', 'TELA IPHONE 14', 'TELA IPHONE 15'] },
  { chave: 'capinha', rotulo: 'CAPINHA', aliases: ['CAPINHA', 'CAPINHAS', 'CASE', 'CASES'] },
  { chave: 'carregador', rotulo: 'CARREGADOR', aliases: ['CARREGADOR', 'CARREGADORES', 'CHARGER', 'CARREGADOR USB'] },
  { chave: 'fone', rotulo: 'FONE', aliases: ['FONE', 'FONES', 'HEADSET', 'AURICULAR', 'AUS', 'EARPHONE', 'EARPHONES'] },
  { chave: 'smartwatch', rotulo: 'SMARTWATCH', aliases: ['SMARTWATCH', 'RELÓGIO', 'WATCH'] },
  { chave: 'celular', rotulo: 'CELULAR', aliases: ['CELULAR', 'SMARTPHONE', 'SAMSUNG', 'XIAOMI', 'MOTOROLA'] },
];

const PALAVRAS_DE_PARADA = ['DE', 'DA', 'DO', 'E', 'O', 'A', 'COM', 'PARA', 'PRA', 'POR', 'UM', 'UMA', 'NO', 'NA', 'DOS', 'DAS', 'QUE', 'QUEM', 'SE', 'COMO', 'EM', 'ENTRE', 'SOBRE', 'NOS', 'NAS'];

function normalizarTexto(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function ehConsultaDireta(prompt = '') {
  const texto = normalizarTexto(prompt);
  return /(QUANTOS|QTOS|QTAS|QTS|QUANTIDADE|NUMERO DE|NÚMERO DE|TOTAL DE|QUANTIDADES)/.test(texto);
}

function parseValor(valorBruto = 0) {
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
}

function extrairQuantidadeDescricao(descricao = '') {
  const texto = normalizarTexto(descricao);
  const match = texto.match(/(\d+)\s*(?:x|×)?\s*/);
  return match ? Number(match[1]) || 1 : 1;
}

function limparNomeProduto(descricao = '') {
  const texto = normalizarTexto(descricao)
    .replace(/^(?:\d+\s*(?:X|×)?\s*|VENDA|ITEM|PRODUTO|SERVICO|SERVIÇO)\s*/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ');

  const tokens = texto
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !PALAVRAS_DE_PARADA.includes(token))
    .filter((token) => !['R', 'RS', 'VALOR', 'VLR', 'REAL', 'REAIS', 'TOTAL', 'ITEM', 'PRODUTO', 'VENDA', 'VENDAS'].includes(token))
    .filter((token) => !/^\d+$/.test(token));

  return tokens.slice(0, 4).join(' ').trim() || 'ITEM SEM IDENTIFICAÇÃO';
}

function extrairItensSolicitados(prompt = '') {
  const texto = normalizarTexto(prompt);
  if (/(TODOS|GERAL|COMPLETO|TUDO|TODAS)/.test(texto)) return [];

  const itensEncontrados = ITENS_IA.filter((item) => item.aliases.some((alias) => texto.includes(alias)));
  if (itensEncontrados.length > 0) return itensEncontrados.map((item) => item.rotulo);

  const tokens = texto
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !PALAVRAS_DE_PARADA.includes(token))
    .filter((token) => !['FAÇA', 'FACA', 'RELATORIO', 'RELATÓRIO', 'VENDAS', 'VENDIDO', 'VENDIDOS', 'MES', 'ANO', 'LETIVO', 'MENSAL', 'ANUAL', 'VALOR', 'VALORES', 'TOTAL', 'ITEM', 'ITENS', 'POR', 'MOSTRE', 'MOSTRA', 'QUERO', 'QUERIA', 'ME', 'DIGA', 'DE', 'DO', 'DA', 'COM', 'PARA', 'PRA'].includes(token));

  return tokens.slice(0, 6).map((token) => token.replace(/^O/, '')).filter(Boolean);
}

function extrairTipoPedido(prompt = '') {
  const texto = normalizarTexto(prompt);
  if (/(TOP|MAIS VEND|MAIS VENDIDOS|MAIS VENDIDO)/.test(texto)) return 'top';
  if (/(MAIOR FATUR|MAIOR VALOR|MAIOR VALORES|MAIOR RECEITA)/.test(texto)) return 'faturamento';
  if (/(RESUMO|GERAL|VISÃO|PANORAMA)/.test(texto)) return 'resumo';
  return 'lista';
}

function extrairPeriodoRelatorio(texto = '', contexto = {}) {
  const txt = normalizarTexto(texto);
  const mesPorNome = Object.keys(MES_POR_NOME).find((nome) => txt.includes(nome));

  if (txt.includes('ANO LETIVO') || txt.includes('ANUAL') || txt.includes('ANO')) {
    return { tipo: 'ano', ano: contexto.anoRelatorio || new Date().getFullYear() };
  }

  if (txt.includes('HOJE') || txt.includes('DIA')) {
    return { tipo: 'dia', data: contexto.data || obterDataLocal() };
  }

  if (txt.includes('TODOS') || txt.includes('GERAL') || txt.includes('COMPLETO') || txt.includes('TUDO') || txt.includes('TODAS')) {
    return { tipo: 'todos' };
  }

  if (mesPorNome) {
    return { tipo: 'mes', mes: MES_POR_NOME[mesPorNome], ano: contexto.anoRelatorio || new Date().getFullYear() };
  }

  return { tipo: 'mes', mes: contexto.mesFiltro || new Date().getMonth() + 1, ano: contexto.anoRelatorio || new Date().getFullYear() };
}

function obterDataLocal() {
  const d = new Date();
  const fuso = d.getTimezoneOffset() * 60000;
  return new Date(d - fuso).toISOString().split('T')[0];
}

function calcularPeriodoAnterior(periodo) {
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
}

function filtrarPeriodoTransacao(transacao, periodo) {
  if (!transacao.data) return false;
  const [ano, mes, dia] = transacao.data.split('-');

  if (periodo.tipo === 'todos') return true;
  if (periodo.tipo === 'dia') return `${ano}-${mes}-${dia}` === periodo.data;
  if (periodo.tipo === 'mes') return Number(mes) === periodo.mes && Number(ano) === periodo.ano;
  if (periodo.tipo === 'ano') return Number(ano) === periodo.ano;
  return false;
}

function extrairItemVendas(descricao = '') {
  const texto = normalizarTexto(descricao);

  const itemEncontrado = ITENS_IA.find((item) => item.aliases.some((alias) => texto.includes(alias)));
  if (itemEncontrado) return itemEncontrado.rotulo;

  return limparNomeProduto(descricao);
}

function formatarReal(numero) {
  return Number(numero || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarPercentual(numero) {
  return `${numero >= 0 ? '+' : ''}${numero.toFixed(1)}%`;
}

function ehPedidoRelatorio(prompt = '') {
  const texto = normalizarTexto(prompt);
  return /(RELATORIO|RELATÓRIO|RESUMO|ANALISE|ANALIS|TOP|MAIOR|COMPARATIVO|MENSAL|ANUAL|MES|ANO|GERAL|TOTAL|VISAO|PANORAMA)/.test(texto);
}

function montarRelatorioVendas({ transacoes = [], prompt = '', contexto = {} }) {
  const periodo = extrairPeriodoRelatorio(prompt, contexto);
  const periodoAnterior = calcularPeriodoAnterior(periodo);
  const itensSolicitados = extrairItensSolicitados(prompt);
  const tipoPedido = extrairTipoPedido(prompt);
  const limiteTop = /TOP\s*(\d+)/i.test(normalizarTexto(prompt)) ? Number(normalizarTexto(prompt).match(/TOP\s*(\d+)/i)?.[1] || 5) : 5;
  const textoPrompt = String(prompt || '').trim();
  const pedidoRelatorio = ehPedidoRelatorio(textoPrompt);
  const consultaDireta = ehConsultaDireta(textoPrompt);

  const transacoesFiltradas = transacoes.filter((transacao) => {
    const descricao = normalizarTexto(transacao.descricao || '');
    const item = extrairItemVendas(transacao.descricao);
    const temItem = item !== 'ITEM SEM IDENTIFICAÇÃO';
    const atendeFiltro = itensSolicitados.length === 0 || itensSolicitados.some((solicitado) => normalizarTexto(item).includes(normalizarTexto(solicitado)) || normalizarTexto(solicitado).includes(normalizarTexto(item)));

    if (itensSolicitados.length > 0) {
      return filtrarPeriodoTransacao(transacao, periodo) && atendeFiltro;
    }

    return filtrarPeriodoTransacao(transacao, periodo) && (pedidoRelatorio ? (transacao.tipo === 'entrada' || temItem || descricao.includes('VENDA')) : (temItem || descricao.includes('VENDA')));
  });

  const transacoesAnterior = transacoes.filter((transacao) => {
    const descricao = normalizarTexto(transacao.descricao || '');
    const item = extrairItemVendas(transacao.descricao);
    const temItem = item !== 'ITEM SEM IDENTIFICAÇÃO';
    const atendeFiltro = itensSolicitados.length === 0 || itensSolicitados.some((solicitado) => normalizarTexto(item).includes(normalizarTexto(solicitado)) || normalizarTexto(solicitado).includes(normalizarTexto(item)));

    if (itensSolicitados.length > 0) {
      return filtrarPeriodoTransacao(transacao, periodoAnterior) && atendeFiltro;
    }

    return filtrarPeriodoTransacao(transacao, periodoAnterior) && (pedidoRelatorio ? (transacao.tipo === 'entrada' || temItem || descricao.includes('VENDA')) : (temItem || descricao.includes('VENDA')));
  });

  const agrupadoAtual = new Map();
  const agrupadoAnterior = new Map();

  const adicionarGrupo = (mapa, transacao) => {
    const item = extrairItemVendas(transacao.descricao);
    const quantidade = extrairQuantidadeDescricao(transacao.descricao);
    const valor = parseValor(transacao.valor);
    const entrada = mapa.get(item) || { rotulo: item, quantidade: 0, valorTotal: 0, transacoes: 0 };

    entrada.quantidade += quantidade;
    entrada.valorTotal += valor;
    entrada.transacoes += 1;
    mapa.set(item, entrada);
  };

  transacoesFiltradas.forEach((transacao) => adicionarGrupo(agrupadoAtual, transacao));
  transacoesAnterior.forEach((transacao) => adicionarGrupo(agrupadoAnterior, transacao));

  const itens = Array.from(agrupadoAtual.values())
    .filter((item) => item.quantidade > 0)
    .sort((a, b) => {
      if (tipoPedido === 'top') {
        return b.quantidade - a.quantidade || b.valorTotal - a.valorTotal;
      }
      if (tipoPedido === 'faturamento') {
        return b.valorTotal - a.valorTotal || b.quantidade - a.quantidade;
      }
      return b.valorTotal - a.valorTotal || b.quantidade - a.quantidade;
    });

  const itensAnterior = Array.from(agrupadoAnterior.values()).filter((item) => item.quantidade > 0);

  const valorTotalGeral = itens.reduce((soma, item) => soma + item.valorTotal, 0);
  const quantidadeTotal = itens.reduce((soma, item) => soma + item.quantidade, 0);
  const valorTotalAnterior = itensAnterior.reduce((soma, item) => soma + item.valorTotal, 0);
  const quantidadeTotalAnterior = itensAnterior.reduce((soma, item) => soma + item.quantidade, 0);
  const percentualValor = valorTotalAnterior === 0 ? null : ((valorTotalGeral - valorTotalAnterior) / valorTotalAnterior) * 100;
  const percentualQuantidade = quantidadeTotalAnterior === 0 ? null : ((quantidadeTotal - quantidadeTotalAnterior) / quantidadeTotalAnterior) * 100;

  const periodoLabel = periodo.tipo === 'todos'
    ? 'todos os períodos'
    : periodo.tipo === 'dia'
      ? `dia ${periodo.data.split('-').reverse().join('/')}`
      : periodo.tipo === 'ano'
        ? `ano letivo ${periodo.ano}`
        : `mês ${MESES.find((item) => item.n === periodo.mes)?.nome?.toLowerCase() || periodo.mes}`;

  const periodoAnteriorLabel = periodoAnterior.tipo === 'todos'
    ? 'todos os períodos anteriores'
    : periodoAnterior.tipo === 'dia'
      ? `dia ${periodoAnterior.data.split('-').reverse().join('/')}`
      : periodoAnterior.tipo === 'ano'
        ? `ano letivo ${periodoAnterior.ano}`
        : `mês ${MESES.find((item) => item.n === periodoAnterior.mes)?.nome?.toLowerCase() || periodoAnterior.mes}`;

  const verbo = /TROCA|TROC/.test(normalizarTexto(prompt)) ? 'trocados' : /VEND/.test(normalizarTexto(prompt)) ? 'vendidos' : 'registrados';

  const itensExibidos = tipoPedido === 'top' ? itens.slice(0, Math.max(1, limiteTop)) : itens;
  const destaque = itensExibidos[0]
    ? `Item destaque: ${itensExibidos[0].rotulo} com ${itensExibidos[0].quantidade} ${verbo} e faturamento de R$ ${formatarReal(itensExibidos[0].valorTotal)}.`
    : 'Nenhum item destaque encontrado.';
  const ticketMedio = quantidadeTotal === 0 ? 0 : valorTotalGeral / quantidadeTotal;

  const linhas = itensExibidos.map((item) => `- ${item.rotulo}: ${item.quantidade} ${verbo} | Valor total: R$ ${formatarReal(item.valorTotal)}`);

  const comparativo = valorTotalAnterior || quantidadeTotalAnterior
    ? `Comparativo com ${periodoAnteriorLabel}: ${quantidadeTotalAnterior} itens | Valor anterior: R$ ${formatarReal(valorTotalAnterior)} | ` +
      `Variação quantidade: ${quantidadeTotalAnterior === 0 ? 'N/A' : formatarPercentual(percentualQuantidade)} | ` +
      `Variação valor: ${valorTotalAnterior === 0 ? 'N/A' : formatarPercentual(percentualValor)}`
    : `Sem dados do período anterior (${periodoAnteriorLabel}) para comparação.`;

  const resumo = `Resumo: ${quantidadeTotal} itens | Valor total: R$ ${formatarReal(valorTotalGeral)} | Ticket médio: R$ ${formatarReal(ticketMedio)}.`;

  const respostaBasica = itensExibidos.length > 0
    ? itensExibidos.map((item) => `- ${item.rotulo}: ${item.quantidade} ${verbo}`).join('\n')
    : 'Nenhum item de venda encontrado com os termos informados.';

  const respostaCompleta = itensExibidos.length > 0
    ? `RELATÓRIO - ${periodoLabel.toUpperCase()}\n` +
      `${resumo}\n` +
      `${destaque}\n` +
      `${respostaBasica}`
    : 'Nenhum item de venda encontrado com os termos informados.';

  // Detecta se o relatório foi solicitado como privado
  const ehPrivado = /PRIVADO/.test(normalizarTexto(prompt));

  // Se relatório privado, montar Resumo Executivo e Ranking Mensal de Produtos
  let resumoExecutivo = null;
  let rankingMensal = null;

  if (ehPrivado && itens.length > 0) {
    const topPorQuantidade = itens.slice().sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
    const topPorValor = itens.slice().sort((a, b) => b.valorTotal - a.valorTotal).slice(0, 5);

    resumoExecutivo = `RESUMO EXECUTIVO - ${periodoLabel.toUpperCase()}\n` +
      `- Valor total: R$ ${formatarReal(valorTotalGeral)}\n` +
      `- Quantidade total: ${quantidadeTotal}\n` +
      `- Ticket médio: R$ ${formatarReal(ticketMedio)}\n` +
      (percentualValor === null ? `- Variação de receita: N/A\n` : `- Variação de receita: ${formatarPercentual(percentualValor)}\n`) +
      (percentualQuantidade === null ? `- Variação de quantidade: N/A\n` : `- Variação de quantidade: ${formatarPercentual(percentualQuantidade)}\n`) +
      `- Principais por quantidade: ${topPorQuantidade.map((p) => `${p.rotulo} (${p.quantidade})`).join(', ')}\n` +
      `- Principais por faturamento: ${topPorValor.map((p) => `${p.rotulo} (R$ ${formatarReal(p.valorTotal)})`).join(', ')}`;

    const rankingItems = itens.slice().sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
    rankingMensal = `RANKING MENSAL DE PRODUTOS - ${periodoLabel.toUpperCase()}\n` +
      rankingItems.map((it, idx) => `${idx + 1}. ${it.rotulo} — ${it.quantidade} ${verbo} | R$ ${formatarReal(it.valorTotal)}`).join('\n');
  }

  const resposta = consultaDireta
    ? respostaBasica
    : (ehPrivado ? (`${respostaCompleta}\n\n${resumoExecutivo || ''}\n\n${rankingMensal || ''}`) : respostaCompleta);

  return {
    resposta,
    periodo,
    periodoAnterior,
    itens,
    resumoExecutivo,
    rankingMensal,
  };
}

export {
  MESES,
  normalizarTexto,
  extrairQuantidadeDescricao,
  extrairPeriodoRelatorio,
  calcularPeriodoAnterior,
  filtrarPeriodoTransacao,
  extrairItemVendas,
  montarRelatorioVendas,
};

export default montarRelatorioVendas;
