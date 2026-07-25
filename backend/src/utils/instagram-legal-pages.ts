/**
 * Páginas públicas exigidas pela Meta (privacidade + exclusão de dados) servidas
 * pelo backend — garante URL pública via tunnel em dev, antes do deploy do site.
 * Em produção, as páginas equivalentes do Nuxt assumem.
 */

function wrap(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Clube Florescer</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #faf7f2; margin: 0; padding: 2.5rem 1.25rem; color: #333; line-height: 1.65; }
  main { max-width: 46rem; margin: 0 auto; background: #fff; border-radius: 1.5rem; padding: 2.5rem 2rem; box-shadow: 0 10px 40px rgba(0,0,0,.06); }
  h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
  h2 { font-size: 1.1rem; margin: 1.5rem 0 .5rem; }
  .updated { font-size: .85rem; opacity: .65; margin-bottom: 1.5rem; }
  ul, ol { padding-left: 1.25rem; }
  a { color: #2d5a27; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export function renderInstagramPrivacyPage(): string {
  return wrap(
    "Privacidade — Instagram",
    `<h1>Política de Privacidade — Automação de Instagram</h1>
<p class="updated">Última atualização: 25 de julho de 2026</p>
<p>Esta política descreve como o <strong>Clube Florescer</strong> trata os dados recebidos por meio da integração com a plataforma Instagram (Meta), usada para responder automaticamente comentários, respostas de story e mensagens diretas.</p>
<h2>Quais dados coletamos</h2>
<ul>
<li>Identificador da conta no Instagram no escopo deste aplicativo (IGSID) e nome de usuário público;</li>
<li>Conteúdo de comentários e mensagens que contenham as palavras-chave configuradas;</li>
<li>Data e hora das interações.</li>
</ul>
<h2>Para que usamos</h2>
<ul>
<li>Enviar a resposta automática solicitada (por exemplo, um link de material);</li>
<li>Evitar envios duplicados para a mesma interação;</li>
<li>Registrar o histórico mínimo necessário ao funcionamento do serviço.</li>
</ul>
<h2>O que não fazemos</h2>
<ul>
<li>Não vendemos nem compartilhamos dados com terceiros;</li>
<li>Não enviamos mensagens em massa não solicitadas;</li>
<li>Não armazenamos senhas do Instagram — a conexão é feita pelo login oficial da Meta.</li>
</ul>
<h2>Armazenamento e segurança</h2>
<p>Os dados ficam em banco de dados privado, acessível apenas pelo servidor do Clube Florescer, e são mantidos somente pelo tempo necessário ao funcionamento da automação.</p>
<h2>Seus direitos</h2>
<p>Você pode solicitar a exclusão dos seus dados a qualquer momento — veja <a href="/exclusao-de-dados-instagram">Exclusão de dados</a> ou escreva para <a href="mailto:contato@clubeflorescer.com.br">contato@clubeflorescer.com.br</a>.</p>`
  );
}

export function renderInstagramDataDeletionPage(): string {
  return wrap(
    "Exclusão de dados — Instagram",
    `<h1>Exclusão de Dados — Automação de Instagram</h1>
<p class="updated">Última atualização: 25 de julho de 2026</p>
<p>Se você interagiu com o Instagram do <strong>Clube Florescer</strong> e deseja excluir os dados associados à sua conta (identificador, nome de usuário e histórico de interações), siga um dos caminhos abaixo.</p>
<h2>Como solicitar a exclusão</h2>
<ol>
<li>Envie um e-mail para <a href="mailto:contato@clubeflorescer.com.br">contato@clubeflorescer.com.br</a> com o assunto <strong>“Exclusão de dados — Instagram”</strong>, informando o seu nome de usuário (@) do Instagram; ou</li>
<li>Envie uma mensagem direta no Instagram do Clube Florescer pedindo a exclusão.</li>
</ol>
<h2>O que acontece depois</h2>
<ul>
<li>Confirmamos o recebimento do pedido em até 72 horas;</li>
<li>Excluímos todos os registros associados à sua conta em até 30 dias;</li>
<li>Você recebe uma confirmação quando a exclusão for concluída.</li>
</ul>
<p>Detalhes sobre o tratamento de dados estão na nossa <a href="/privacidade-instagram">Política de Privacidade</a>.</p>`
  );
}
