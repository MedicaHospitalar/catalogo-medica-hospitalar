# Catálogo Médica Hospitalar

Site do catálogo de produtos da **Médica Hospitalar** (Maceió-AL): material e medicamento médico hospitalar.

O cliente busca os produtos, monta a lista com as quantidades e envia o pedido de cotação pelo WhatsApp da empresa. Os preços não aparecem no site.

## Funcionalidades
- Busca por nome, princípio ativo ou código interno. Entende termos do dia a dia, como "jelco", "soro fisiológico" e "micropore".
- Filtro por grupo (material, medicamentos, soros) e por tipo de produto.
- Lista de cotação que fica salva no navegador, com espaço para itens que não estão no catálogo.
- Envio da lista pronta pelo WhatsApp ou cópia do texto.
- Funciona no celular.

## Estrutura
```
index.html          página
css/estilo.css      visual (cores da marca no início do arquivo)
js/config.js        nome, WhatsApp e contatos da empresa
js/app.js           busca, filtros e lista de cotação
data/produtos.json  catálogo (código, descrição, unidade, tipo, grupo)
img/                logo e ícone
```

## Configurar
Edite `js/config.js` e coloque o WhatsApp que recebe as cotações (55 + DDD + número, só dígitos).

## Atualizar o catálogo
Substitua `data/produtos.json`. Cada item segue este formato:
```json
{"c":"931","d":"SER DESC 10ML C/AG 25X07 LL SR REF 10572","u":"UND","t":"Seringa descartável","g":"Material correlato"}
```
`c` = código interno, `d` = descrição, `u` = unidade, `t` = tipo de produto, `g` = grupo (`Material correlato`, `Medicamento` ou `Soro / solução parenteral`).

## Publicar (GitHub Pages)
No repositório: **Settings → Pages → Branch: `main` / pasta `/ (root)` → Save**. Em 1 ou 2 minutos o site fica no ar em `https://<usuario>.github.io/<repositorio>/`.

## Testar no computador
O catálogo é carregado por `fetch`, então abrir o `index.html` direto com dois cliques não funciona. Rode um servidor simples na pasta:
```
python -m http.server 8000
```
e acesse http://localhost:8000.
