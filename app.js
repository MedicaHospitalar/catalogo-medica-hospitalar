(() => {
  'use strict';
  const C = window.CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const POR_PAGINA = 60;

  // ---------- utilidades ----------
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => n.toLocaleString('pt-BR');

  // Como o cliente escreve -> como aparece no cadastro
  const SINONIMOS = {
    SERINGA: ['SER ', 'SERINGA'], SORO: ['SOL ', 'SORO', 'AGUA P/INJ'], FISIOLOGICO: ['CL DE SODIO 0,9', 'FISIOLOGICO'],
    GLICOSADO: ['GLICOSE', 'GLICOSADO'], JELCO: ['CATETER IV'], ABOCATH: ['CATETER IV'], GELCO: ['CATETER IV'],
    MICROPORE: ['MICROPOROSA'], ATADURA: ['AT. ', 'ATADURA'], CREPE: ['CREP'], DESCARPACK: ['DESCARPACK', 'COL MAT P CORT'],
    LIDOCAINA: ['LIDOCAINA', 'XYLESTESIN'], CLOREXIDINA: ['CLOREX', 'RIOHEX'], LUVAS: ['LUVA'], AGULHAS: ['AGULHA'], SERINGAS: ['SER ', 'SERINGA'],
  };

  const guardar = {
    ler(k, padrao) { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } },
    gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* navegador sem armazenamento */ } },
  };

  // ---------- estado ----------
  let produtos = [];
  const estado = { grupo: 'Todos', tipo: null, busca: '', limite: POR_PAGINA, filtroTipos: '' };
  let lista = guardar.ler('mh-cotacao', []); // [{c, d, u, q, livre?}]
  const dados = guardar.ler('mh-dados', { nome: '', doc: '', obs: '' });

  // ---------- busca ----------
  function termos(txt) {
    return norm(txt).replace(/(\d+)\s+(ML|MG|G|L|MCG|UI)\b/g, '$1$2').split(/\s+/).filter(Boolean);
  }
  // sinônimo: precisa estar no começo de uma palavra; termo digitado: pode estar em qualquer parte
  function casaTermo(texto, t) {
    const alts = SINONIMOS[t];
    if (alts) return alts.some((a) => texto.includes(' ' + a));
    // tamanhos e siglas curtas (P, M, G, EP, IV) só valem como palavra inteira
    if (t.length <= 2 && !/^\d+$/.test(t)) return texto.includes(' ' + t + ' ');
    return texto.includes(t);
  }
  function filtrarBusca() {
    const bruto = estado.busca.trim();
    const ts = termos(bruto);
    if (!ts.length) return produtos;
    const achados = [];
    for (const p of produtos) {
      if (p.c === bruto) { achados.push({ p, pontos: 1000 }); continue; }
      if (!ts.every((t) => casaTermo(p._n, t))) continue;
      // mais relevante: termos que batem no TIPO do produto e descrição que começa com o 1º termo
      let pontos = ts.filter((t) => casaTermo(p._t, t)).length * 10;
      if (p._n.slice(p._n.indexOf('|') + 1).startsWith(' ' + (SINONIMOS[ts[0]] || [ts[0]])[0])) pontos += 1;
      achados.push({ p, pontos });
    }
    return achados.sort((a, b) => b.pontos - a.pontos).map((x) => x.p);
  }

  // ---------- desenho ----------
  function marcar(texto) {
    let h = esc(texto);
    const ts = termos(estado.busca).filter((t) => t.length > 1 && !SINONIMOS[t]);
    for (const t of ts) {
      const rx = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')})`, 'gi');
      h = h.replace(/(^|>)([^<]*)/g, (m, a, b) => a + b.replace(rx, '<mark>$1</mark>'));
    }
    return h;
  }

  function desenhar() {
    const achados = filtrarBusca();

    // grupos (com contagem dentro da busca)
    const porGrupo = { Todos: achados.length };
    for (const p of achados) porGrupo[p.g] = (porGrupo[p.g] || 0) + 1;
    const nomesGrupo = { 'Material correlato': 'Material médico-hospitalar', Medicamento: 'Medicamentos', 'Soro / solução parenteral': 'Soros e soluções' };
    $('#grupos').innerHTML = ['Todos', 'Material correlato', 'Medicamento', 'Soro / solução parenteral']
      .map((g) => `<button class="grupo" data-grupo="${esc(g)}" aria-pressed="${estado.grupo === g}">${esc(nomesGrupo[g] || g)}<span>${fmt(porGrupo[g] || 0)}</span></button>`)
      .join('');

    const doGrupo = estado.grupo === 'Todos' ? achados : achados.filter((p) => p.g === estado.grupo);

    // tipos
    const porTipo = new Map();
    for (const p of doGrupo) porTipo.set(p.t, (porTipo.get(p.t) || 0) + 1);
    const ft = norm(estado.filtroTipos);
    const tipos = [...porTipo].filter(([t]) => !ft || norm(t).includes(ft)).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
    if (estado.tipo && !porTipo.has(estado.tipo)) estado.tipo = null;
    $('#tipos').innerHTML = tipos
      .map(([t, n]) => `<li><button class="tipo" data-tipo="${esc(t)}" aria-pressed="${estado.tipo === t}"><span>${esc(t)}</span><span>${fmt(n)}</span></button></li>`)
      .join('');
    $('#limparTipo').hidden = !estado.tipo;

    const final = estado.tipo ? doGrupo.filter((p) => p.t === estado.tipo) : doGrupo;
    const mostrados = final.slice(0, estado.limite);
    const naLista = new Map(lista.filter((i) => !i.livre).map((i) => [i.c, i.q]));

    $('#produtos').innerHTML = mostrados
      .map((p) => {
        const q = naLista.get(p.c);
        return `<li class="produto${q ? ' na-lista' : ''}">
          <div>
            <p class="produto__tipo">${esc(p.t)}</p>
            <p class="produto__desc">${marcar(p.d)}</p>
            <p class="produto__meta"><span>Código: <b>${marcar(p.c)}</b></span><span>Unidade: ${esc(p.u || '-')}</span></p>
          </div>
          <form class="adicionar" data-codigo="${esc(p.c)}">
            <input class="qtd" type="number" min="1" step="1" value="${q || 1}" aria-label="Quantidade de ${esc(p.d)}" required>
            <button class="botao">${q ? 'Atualizar' : 'Adicionar'}</button>
          </form>
        </li>`;
      })
      .join('');

    const partes = [`${fmt(final.length)} ${final.length === 1 ? 'produto' : 'produtos'}`];
    if (estado.busca.trim()) partes.push(`para “${esc(estado.busca.trim())}”`);
    if (estado.tipo) partes.push(`em ${esc(estado.tipo)}`);
    $('#resumo').innerHTML = partes.join(' ');
    $('#mais').hidden = final.length <= estado.limite;
    $('#mais').textContent = `Mostrar mais (${fmt(final.length - estado.limite)} restantes)`;
    $('#vazio').hidden = final.length > 0;
  }

  // ---------- lista de cotação ----------
  function salvarLista() {
    guardar.gravar('mh-cotacao', lista);
    desenharLista();
  }

  function desenharLista() {
    const n = lista.length;
    $('#contador').hidden = !n;
    $('#contador').textContent = n;
    $('#listaVazia').hidden = !!n;
    $('#itensLista').innerHTML = lista
      .map(
        (i, idx) => `<li class="item">
          <div class="item__desc">${esc(i.d)}<small>${i.livre ? 'Item não encontrado no catálogo' : `Cód. ${esc(i.c)} · ${esc(i.u || '')}`}</small></div>
          <input class="qtd" type="number" min="1" value="${i.q}" data-idx="${idx}" aria-label="Quantidade">
          <button class="remover" data-idx="${idx}" aria-label="Remover ${esc(i.d)}">×</button>
        </li>`
      )
      .join('');
    $('#enviar').disabled = !n || !C.whatsapp;
    $('#copiar').disabled = !n;
    $('#esvaziar').disabled = !n;
    $('#avisoWhats').hidden = !!C.whatsapp || !n;
  }

  function textoCotacao() {
    const linhas = ['Olá! Gostaria de uma cotação dos itens abaixo:', ''];
    lista.forEach((i, n) => {
      linhas.push(`${n + 1}. ${i.q} ${i.livre ? 'un' : i.u || 'un'} - ${i.d}${i.livre ? ' (não achei no catálogo)' : ` (cód. ${i.c})`}`);
    });
    const d = { nome: $('#cliNome').value.trim(), doc: $('#cliDoc').value.trim(), obs: $('#cliObs').value.trim() };
    if (d.nome || d.doc || d.obs) linhas.push('');
    if (d.nome) linhas.push(`Nome/empresa: ${d.nome}`);
    if (d.doc) linhas.push(`CNPJ/CPF: ${d.doc}`);
    if (d.obs) linhas.push(`Observações: ${d.obs}`);
    linhas.push('', '(Lista montada pelo catálogo do site)');
    return linhas.join('\n');
  }

  function adicionar(codigo, qtd) {
    const p = produtos.find((x) => x.c === codigo);
    if (!p) return;
    const existente = lista.find((i) => !i.livre && i.c === codigo);
    if (existente) existente.q = qtd;
    else lista.push({ c: p.c, d: p.d, u: p.u, q: qtd });
    salvarLista();
    desenhar();
    aviso(existente ? 'Quantidade atualizada na cotação' : 'Adicionado à cotação');
  }

  // ---------- gavetas ----------
  function abrir(qual) {
    const el = $(qual);
    el.classList.add('aberta');
    el.setAttribute('aria-hidden', 'false');
    $('#veu').hidden = false;
    if (qual === '#lista') $('#abrirLista').setAttribute('aria-expanded', 'true');
  }
  function fecharTudo() {
    for (const q of ['#lista', '#filtros']) {
      $(q).classList.remove('aberta');
      if (q === '#lista') $(q).setAttribute('aria-hidden', 'true');
    }
    $('#veu').hidden = true;
    $('#abrirLista').setAttribute('aria-expanded', 'false');
  }

  let timerAviso;
  function aviso(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('visivel');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => t.classList.remove('visivel'), 1800);
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    aviso('Lista copiada');
  }

  // ---------- eventos ----------
  let timerBusca;
  $('#busca').addEventListener('input', (e) => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(() => {
      estado.busca = e.target.value;
      estado.limite = POR_PAGINA;
      estado.tipo = null;
      desenhar();
    }, 150);
  });
  $('#grupos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-grupo]');
    if (!b) return;
    estado.grupo = b.dataset.grupo;
    estado.tipo = null;
    estado.limite = POR_PAGINA;
    desenhar();
  });
  $('#tipos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tipo]');
    if (!b) return;
    estado.tipo = estado.tipo === b.dataset.tipo ? null : b.dataset.tipo;
    estado.limite = POR_PAGINA;
    desenhar();
    if (window.matchMedia('(max-width: 860px)').matches) fecharTudo();
    window.scrollTo({ top: $('.conteudo').offsetTop - 120, behavior: 'smooth' });
  });
  $('#buscaTipo').addEventListener('input', (e) => {
    estado.filtroTipos = e.target.value;
    desenhar();
  });
  $('#limparTipo').addEventListener('click', () => {
    estado.tipo = null;
    desenhar();
  });
  $('#mais').addEventListener('click', () => {
    estado.limite += POR_PAGINA;
    desenhar();
  });
  $('#produtos').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.closest('form');
    const q = Math.max(1, Math.round(Number(f.querySelector('.qtd').value) || 1));
    adicionar(f.dataset.codigo, q);
  });

  $('#abrirLista').addEventListener('click', () => abrir('#lista'));
  $('#fecharLista').addEventListener('click', fecharTudo);
  $('#abrirFiltros').addEventListener('click', () => abrir('#filtros'));
  $('#veu').addEventListener('click', fecharTudo);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && fecharTudo());

  $('#itensLista').addEventListener('change', (e) => {
    if (!e.target.matches('.qtd')) return;
    lista[e.target.dataset.idx].q = Math.max(1, Math.round(Number(e.target.value) || 1));
    salvarLista();
    desenhar();
  });
  $('#itensLista').addEventListener('click', (e) => {
    const b = e.target.closest('.remover');
    if (!b) return;
    lista.splice(Number(b.dataset.idx), 1);
    salvarLista();
    desenhar();
  });
  $('#itemLivre').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = $('#textoLivre').value.trim();
    if (!d) return;
    lista.push({ c: '', d, u: 'un', q: Math.max(1, Math.round(Number($('#qtdLivre').value) || 1)), livre: true });
    $('#textoLivre').value = '';
    $('#qtdLivre').value = 1;
    salvarLista();
  });
  for (const [id, k] of [['#cliNome', 'nome'], ['#cliDoc', 'doc'], ['#cliObs', 'obs']]) {
    $(id).value = dados[k] || '';
    $(id).addEventListener('input', (e) => {
      dados[k] = e.target.value;
      guardar.gravar('mh-dados', dados);
    });
  }
  $('#enviar').addEventListener('click', () => {
    const url = `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(textoCotacao())}`;
    window.open(url, '_blank', 'noopener');
  });
  $('#copiar').addEventListener('click', () => copiar(textoCotacao()));
  $('#esvaziar').addEventListener('click', () => {
    if (!lista.length) return;
    lista = [];
    salvarLista();
    desenhar();
    aviso('Lista esvaziada');
  });

  // ---------- configuração no rodapé ----------
  document.querySelectorAll('[data-config]').forEach((el) => {
    const k = el.dataset.config;
    if (k === 'contato') {
      const partes = [C.telefoneExibicao, C.email, C.endereco].filter(Boolean);
      el.textContent = partes.join(' · ');
      el.hidden = !partes.length;
    } else if (C[k]) el.textContent = C[k];
  });

  // ---------- início ----------
  fetch('produtos.json')
    .then((r) => r.json())
    .then((dadosProdutos) => {
      produtos = dadosProdutos.map((p) => ({ ...p, _t: ' ' + norm(p.t) + ' ', _n: ' ' + norm(`${p.c} ${p.t} | ${p.d}`) + ' ' }));
      const q = new URLSearchParams(location.search).get('q');
      if (q) {
        $('#busca').value = q;
        estado.busca = q;
      }
      desenhar();
      desenharLista();
    })
    .catch(() => {
      $('#resumo').textContent = 'Não foi possível carregar o catálogo. Recarregue a página.';
    });
})();
