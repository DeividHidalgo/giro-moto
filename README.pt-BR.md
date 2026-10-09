# Giro Moto

> 🇬🇧 [Read in English](README.md)

Sistema de gestão para **locação de motos**, pensado para o celular: painel do dono e visão do cliente em **um único arquivo HTML estático**. Roda no navegador em modo demonstração ou com um backend [Supabase](https://supabase.com) (login real e controle de acesso feito pelo banco).

<p>
  <img src="docs/screenshots/02-dashboard.png" width="16%" alt="Painel">
  <img src="docs/screenshots/03-bikes.png" width="16%" alt="Motos">
  <img src="docs/screenshots/05-rentals.png" width="16%" alt="Locações">
  <img src="docs/screenshots/04-customers.png" width="16%" alt="Clientes">
  <img src="docs/screenshots/06-customer.png" width="16%" alt="Visão do cliente">
</p>

**Demonstração:** ative o GitHub Pages (abaixo) e entre com `demo` / `demo1234` (dono) ou `rafael.moreira` / `demo1234` (cliente). Os dados de exemplo ficam só na memória e não são salvos.

## Recursos

- **Frota** com status (disponível / alugada / manutenção), placa, km, lembretes de troca de óleo e revisão.
- **Clientes** com CPF (validado), RG, alerta de CNH vencendo, endereço preenchido pelo CEP (via [ViaCEP](https://viacep.com.br)) e anexos de documentos (fotos ou PDFs pequenos, visíveis só ao dono).
- **Locação semanal** com valor fixo, cobrança toda segunda ou sexta; pagamentos abatem as parcelas mais antigas primeiro.
- **Multa e juros por atraso** apenas *sugeridos*; o dono lança como ocorrência (nada é cobrado sozinho). Controle de caução.
- **Pix copia-e-cola** gerado no próprio navegador (BR Code com CRC16) para chave celular, CPF/CNPJ, e-mail ou aleatória.
- **WhatsApp**: mensagem de cobrança com o código Pix para o dono; botões de contato para o cliente (links `wa.me`, sem custo de API).
- **Termo de locação** editável, com aceite do cliente.
- **Vistoria** de entrega/devolução com fotos.
- **Manutenção e resultado por moto.**
- **Logins de cliente** criados só pelo dono; o cliente vê **apenas** os próprios dados: valor devido e próximo vencimento no topo, extrato das parcelas semanais (paga / em aberto / atrasada), explicação de multa e juros, caução, contrato, vistoria com fotos e Pix.
- Exportar backup, PWA instalável, tema claro/escuro.

## Arquitetura e segurança

O app usa uma interface de armazenamento com duas implementações: memória (demonstração) e Supabase. Uma tabela genérica `docs(col, id, data jsonb)` guarda todas as coleções; `profiles(user_id, role, cliente_id)` liga cada usuário a `admin` ou `cliente`.

A autorização é feita **no banco** (Row Level Security): o acesso anônimo é bloqueado, o cliente só lê linhas do próprio `cliente_id` e nunca grava, e o primeiro administrador só pode ser criado uma vez. As regras são testadas em `tests/sql/rls.test.sql`. Veja o diagrama e detalhes no [README em inglês](README.md).

## Como usar

**Demonstração (sem configurar nada):** abra `public/index.html` ou rode `npm run serve`.

**Com Supabase (passo a passo):**

1. Crie um projeto gratuito no Supabase. Em *Authentication → Sign In / Providers*, desligue **Confirm email**.
2. No *SQL Editor*, rode o conteúdo de [`sql/schema.sql`](sql/schema.sql).
3. Copie `public/config.example.js` para `public/config.js` e preencha URL, chave publicável e um e-mail seu em `EMAIL_BASE` (o usuário `rafael` vira `voce+rafael@dominio`; é necessário porque o Supabase recusa domínios inexistentes).
4. Publique a pasta `public/` em qualquer hospedagem estática (Netlify, Cloudflare Pages, GitHub Pages), abra o site e use **Primeiro acesso: criar administrador**.

**Demo no GitHub Pages:** *Settings → Pages → Source: GitHub Actions*. O workflow incluso publica `public/` com configuração vazia (modo demonstração).

## Testes

```bash
npm test                                                  # 8 fluxos de interface/regras (Node ≥ 18)
PGHOST=localhost PGUSER=postgres bash tests/sql/run.sh    # testes de RLS em Postgres local descartável
```

## Limitações

- A confirmação do Pix é **manual** (automática exige provedor de pagamento e função de servidor).
- Sem rastreamento GPS; WhatsApp só por links.
- Fotos ficam no banco (para frotas maiores, usar Storage).
- O plano gratuito do Supabase não faz backup automático e pausa por inatividade: use o botão de exportar.
- Interface somente em português.

> **Aviso legal.** O modelo de termo, as multas e os juros são exemplos. Peça a revisão de um advogado antes de usar. Software fornecido "como está", sem garantia.

## Licença

[MIT](LICENSE)
