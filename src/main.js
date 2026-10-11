import "./style.css";
import { db, configured, esc, result, friendly } from "./client.js";
const root = document.querySelector("#app");
let user = null,
  demo = false,
  recovery = false,
  revision = 0;
const demoPeople = [
  {
    id: "demo",
    name: "Alex Martin",
    school: "Université de Paris",
    city: "Paris, France",
    bio: "Un café, des amis et beaucoup trop de temps sur Internet.",
    interests: "Photographie, musique indépendante, cinéma, voyages",
    relationship: "Célibataire",
    created_at: "2005-09-12",
  },
  {
    id: "clara",
    name: "Clara Dubois",
    school: "Université de Paris",
    city: "Paris",
  },
  { id: "thomas", name: "Thomas Bernard", school: "Sciences Po", city: "Lyon" },
  {
    id: "lea",
    name: "Léa Petit",
    school: "Université de Paris",
    city: "Paris",
  },
  {
    id: "hugo",
    name: "Hugo Laurent",
    school: "École des Beaux-Arts",
    city: "Bordeaux",
  },
  { id: "emma", name: "Emma Robert", school: "Sorbonne", city: "Paris" },
  {
    id: "louis",
    name: "Louis Moreau",
    school: "Université de Paris",
    city: "Lille",
  },
];
const link = (id) => `#profile/${encodeURIComponent(id)}`;
const date = (v) =>
  new Date(v).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const avatar = (p, small = false) =>
  p?.avatar
    ? `<img class="avatar ${small ? "small" : ""}" src="${esc(p.avatar)}" alt="Portrait de ${esc(p.name)}">`
    : `<div class="avatar placeholder ${small ? "small" : ""}" role="img" aria-label="Sans photo"><svg viewBox="0 0 140 155" aria-hidden="true"><circle cx="70" cy="51" r="27"/><path d="M16 155v-25c0-36 23-50 54-50s54 14 54 50v25"/></svg></div>`;
const box = (title, body, extra = "") =>
  `<section class="box"><div class="box-title"><h2>${title}</h2>${extra}</div><div class="box-body">${body}</div></section>`;
const empty = (text) => `<p class="empty">${text}</p>`;
function notify(text, error = false) {
  const el = document.querySelector("#notice");
  if (el) {
    el.textContent = text;
    el.className = error ? "notice error" : "notice";
    el.hidden = false;
    el.scrollIntoView({ block: "nearest" });
  }
}
function shell(content, active = "profile") {
  const logged = user || demo;
  root.innerHTML = `<div class="site"><header><a class="brand" href="${logged ? "#profile" : "#welcome"}">[ retrobook ]</a><div class="header-right"><span class="edition">${user && !demo ? `CONNECTÉ · ${esc(user.user_metadata?.name || "Mon compte")}` : "ÉDITION 2005"}</span><nav aria-label="Navigation principale">${logged ? `<a href="#profile">mon profil</a><a href="#friends">mes amis</a><a href="#messages">messages</a><button class="text-button" data-action="refresh">actualiser</button><button class="text-button" data-action="logout">${demo ? "quitter l’aperçu" : "déconnexion"}</button>` : `<a href="#welcome">accueil</a><a href="#login">connexion</a><a href="#signup">inscription</a><a href="#about">à propos</a>`}</nav></div></header><div class="body-layout"><aside>${logged ? `<form id="search-form" class="search"><label for="q">Rechercher un membre</label><div><input id="q" name="q" maxlength="80" placeholder="Nom, prénom…"><button aria-label="Rechercher">go</button></div></form><nav class="sidebar" aria-label="Menu"><a class="${active === "profile" ? "selected" : ""}" href="#profile">Mon profil <span>[ moi ]</span></a><a class="${active === "edit" ? "selected" : ""}" href="#edit">Modifier mon profil</a><a class="${active === "friends" ? "selected" : ""}" href="#friends">Mes amis</a><a class="${active === "directory" ? "selected" : ""}" href="#directory">L’annuaire</a><a class="${active === "messages" ? "selected" : ""}" href="#messages">Ma messagerie</a></nav><div class="side-note"><b>Un peu plus proches.</b><p>Retrouve tes amis.<br>Fais de nouvelles rencontres.<br>Garde le contact.</p></div>` : `<div class="side-login"><h2>Connexion</h2>${loginForm("compact")}</div><nav class="sidebar"><a href="#signup">Créer un compte</a><a href="#forgot">Mot de passe oublié ?</a><a href="#demo">Visiter l’aperçu</a></nav>`}<div class="year-note"><span>2005</span>Le web entre amis.</div></aside><main>${demo ? '<div class="demo-notice">APERÇU • Profils fictifs, aucune donnée partagée. <a href="#welcome" data-action="exit-demo">Créer mon vrai compte →</a></div>' : ""}<div id="notice" role="status" hidden></div>${content}</main></div><footer><div><a href="#about">à propos</a> · <a href="#privacy">confidentialité</a> · <a href="#help">aide</a></div><p>Retrobook — Reconstitution indépendante inspirée de 2005. Non affiliée à Facebook ou Meta.</p></footer></div>`;
}
function loginForm(cls = "") {
  return `<form data-auth="login" class="${cls}"><label>E-mail<input required name="email" type="email" autocomplete="email" maxlength="254"></label><label>Mot de passe<input required name="password" type="password" autocomplete="current-password"></label><button ${!configured ? "disabled" : ""}>Se connecter</button>${!configured ? '<p class="muted">Connexion disponible après configuration du serveur.</p>' : ""}</form>`;
}
function welcome() {
  shell(
    `<div class="page-heading"><h1>Bienvenue sur Retrobook.</h1><span>[ le réseau de vos amis ]</span></div><div class="welcome"><div class="welcome-copy"><div class="eyebrow">IL SUFFIT DE SE RETROUVER.</div><h2>Votre monde.<br>Vos amis.<br>Votre petit coin du web.</h2><p>Un profil, un mur et les gens qui comptent.<br>Retrouvez le plaisir d’être en ligne, ensemble.</p><a class="button" href="#signup">Rejoindre mes amis</a><a class="preview-link" href="#demo">Visiter un profil de démonstration →</a></div><div class="network-art" aria-hidden="true"><div class="net-line l1"></div><div class="net-line l2"></div><div class="net-line l3"></div><div class="net-person p1">a.</div><div class="net-person p2">c.</div><div class="net-person p3">t.</div><div class="net-person p4">l.</div><div class="net-person p5">h.</div><span class="net-caption">les amis de vos amis<br>sont peut-être vos amis.</span></div></div><div class="welcome-features"><div><b>01. Créez votre profil</b><p>Quelques mots sur vous, vos études et ce que vous aimez.</p></div><div><b>02. Retrouvez vos amis</b><p>Cherchez un nom dans l’annuaire et envoyez une invitation.</p></div><div><b>03. Gardez le contact</b><p>Un message privé ou un petit mot sur le mur.</p></div></div><div class="bottom-note">Pas d’algorithme. Juste des personnes.</div>`,
  );
}
function authPage(kind) {
  if (kind === "login") {
    shell(
      `<div class="page-heading"><h1>Connexion</h1></div>${box("Retrouver mes amis", loginForm())}`,
    );
    return;
  }
  const signup = kind === "signup",
    forgot = kind === "forgot",
    reset = kind === "reset";
  shell(
    `<div class="page-heading"><h1>${signup ? "Inscription" : forgot ? "Mot de passe oublié" : "Nouveau mot de passe"}</h1></div>${box(signup ? "Rejoignez votre cercle d’amis" : forgot ? "Retrouver mon compte" : "Sécuriser mon compte", `<form data-auth="${kind}" class="account-form">${signup ? '<p>Votre inscription est gratuite. Ce compte appartient à Retrobook, une reconstitution indépendante.</p><label>Prénom et nom<input name="name" required minlength="2" maxlength="80" autocomplete="name"></label>' : ""}${!reset ? '<label>Adresse e-mail<input name="email" type="email" required autocomplete="email" maxlength="254"></label>' : ""}${!forgot ? '<label>Mot de passe (12 caractères minimum)<input name="password" required type="password" minlength="12" autocomplete="new-password"></label>' : ""}${signup ? '<label class="check"><input type="checkbox" required> J’ai lu les informations sur la <a href="#privacy">confidentialité</a>.</label>' : ""}<button ${!configured ? "disabled" : ""}>${signup ? "Créer mon compte" : forgot ? "Envoyer le lien" : "Enregistrer le mot de passe"}</button>${!configured ? '<p class="configuration">Le serveur de comptes n’est pas encore configuré. L’aperçu reste accessible.</p>' : ""}</form>`)}<p class="under-form"><a href="#welcome">← Retour à l’accueil</a></p>`,
  );
}
async function getProfile(id) {
  return demo
    ? demoPeople.find((p) => p.id === id) || demoPeople[0]
    : result(db.from("profiles").select("*").eq("id", id).single());
}
async function relations(id) {
  return demo
    ? demoPeople.slice(1).map((p, i) => ({
        id: `r${i}`,
        sender: "demo",
        recipient: p.id,
        status: "accepted",
      }))
    : result(
        db
          .from("friendships")
          .select("*")
          .or(`sender.eq.${id},recipient.eq.${id}`)
          .order("created_at", { ascending: false }),
      );
}
async function people(ids) {
  if (!ids.length) return [];
  return demo
    ? demoPeople.filter((p) => ids.includes(p.id))
    : result(
        db
          .from("profiles")
          .select("id,name,school,city,avatar")
          .in("id", [...new Set(ids)]),
      );
}
function cards(list) {
  return list.length
    ? `<div class="people-grid">${list.map((p) => `<a class="person-card" href="${link(p.id)}">${avatar(p, true)}<b>${esc(p.name)}</b><span>${esc(p.school || p.city || "Membre de Retrobook")}</span></a>`).join("")}</div>`
    : empty(
        'Aucun ami pour le moment. <a href="#directory">Retrouver des personnes dans l’annuaire</a>.',
      );
}
async function profilePage(id, token) {
  id = id || (demo ? "demo" : user.id);
  const p = await getProfile(id),
    rs = await relations(id),
    own = id === (demo ? "demo" : user.id);
  const rel = rs.find((r) => r.sender === user?.id || r.recipient === user?.id),
    friends = rs.filter((r) => r.status === "accepted");
  const canRead = own || demo || rel?.status === "accepted";
  const [friendsList, posts, pokes] = await Promise.all([
    people(friends.map((r) => (r.sender === id ? r.recipient : r.sender))),
    canRead
      ? demo
        ? Promise.resolve([
            {
              id: "d1",
              author: "clara",
              body: "On se retrouve au café après les cours ? ☕",
              created_at: "2005-10-10T15:42:00",
            },
            {
              id: "d2",
              author: "thomas",
              body: "Enfin inscrit ! Ça fait plaisir de retrouver tout le monde ici.",
              created_at: "2005-10-09T18:15:00",
            },
          ])
        : result(
            db
              .from("posts")
              .select("*")
              .eq("wall_owner", id)
              .order("created_at", { ascending: false })
              .limit(50),
          )
      : Promise.resolve([]),
    own && !demo
      ? result(db.from("pokes").select("*").eq("recipient", id))
      : Promise.resolve([]),
  ]);
  const authors = await people([
    ...posts.map((p) => p.author),
    ...pokes.map((p) => p.sender),
  ]);
  if (token !== revision) return;
  const authorName = (id) => authors.find((a) => a.id === id)?.name || "Membre";
  shell(
    `<div class="page-heading"><h1>${esc(p.name)}</h1><span>${own ? "[ c’est vous ]" : `[ ${esc(p.school || "membre")} ]`}</span></div><div class="profile-layout"><div class="profile-left">${box("Photo", avatar(p), own ? '<a href="#edit">modifier</a>' : "")}<div class="profile-actions">${own ? '<a href="#edit">Modifier mon profil</a><a href="#friends">Voir mes amis</a>' : demo ? '<button data-action="demo-action">Ajouter à mes amis</button>' : rel?.status === "accepted" ? `<a href="#messages/${esc(id)}">Envoyer un message</a><button data-action="poke" data-id="${esc(id)}">Envoyer un poke</button><button data-action="remove-friend" data-id="${esc(rel.id)}">Retirer de mes amis</button>` : rel ? `${rel.recipient === user.id ? `<button data-action="accept" data-id="${esc(rel.id)}">Accepter la demande</button>` : ""}<button data-action="remove-friend" data-id="${esc(rel.id)}">${rel.sender === user.id ? "Annuler ma demande" : "Refuser la demande"}</button>` : `<button data-action="add-friend" data-id="${esc(id)}">Ajouter à mes amis</button>`}</div>${box("Connexion", `<p>${own ? "Ceci est votre profil." : demo ? "Vous connaissez cette personne." : rel?.status === "accepted" ? "Vous êtes amis." : rel ? "Une demande d’amitié est en attente." : "Vous n’êtes pas encore amis."}</p>`)}${box(`Amis <span class="count">(${friendsList.length})</span>`, cards(friendsList.slice(0, 6)))}</div><div class="profile-right">${box("Informations", `<h3>Informations générales</h3><dl><dt>Nom :</dt><dd>${esc(p.name)}</dd><dt>Réseau :</dt><dd>${esc(p.school || "Non renseigné")}</dd><dt>Ville :</dt><dd>${esc(p.city || "Non renseignée")}</dd><dt>Situation :</dt><dd>${esc(p.relationship || "Non renseignée")}</dd></dl><h3>Informations personnelles</h3><dl><dt>À propos :</dt><dd>${esc(p.bio || "Quelques mots restent à écrire…")}</dd><dt>Intérêts :</dt><dd>${esc(p.interests || "Non renseignés")}</dd></dl>`, own ? '<a href="#edit">modifier</a>' : "")}${pokes.length ? box("Pokes reçus", pokes.map((k) => `<p><a href="${link(k.sender)}">${esc(authorName(k.sender))}</a> vous a envoyé un poke. <button class="text-button" data-action="dismiss-poke" data-id="${esc(k.sender)}">Masquer</button></p>`).join("")) : ""}${box(
      "Le mur",
      canRead
        ? `<p class="section-intro">${own ? "Un petit mot, une nouvelle, un souvenir." : "Laissez un petit mot à " + esc(p.name) + "."}</p><form id="wall-form" data-id="${esc(id)}"><label class="sr-only" for="wall-body">Votre message sur le mur</label><textarea id="wall-body" name="body" required maxlength="2000" rows="3" placeholder="Écrire quelque chose…"></textarea><div class="composer-bottom"><span>Visible par les amis de ce profil</span><button>Publier</button></div></form><div class="wall-posts">${
            posts.length
              ? posts
                  .map(
                    (post) =>
                      `<article class="post">${avatar(
                        authors.find((a) => a.id === post.author),
                        true,
                      )}<div><a href="${link(post.author)}"><b>${esc(authorName(post.author))}</b></a><time>${date(post.created_at)}</time><p>${esc(post.body)}</p>${own || post.author === user?.id ? `<button class="text-button" data-action="delete-post" data-id="${esc(post.id)}">supprimer</button>` : ""}</div></article>`,
                  )
                  .join("")
              : empty("Le mur attend son premier message.")
          }</div>`
        : empty(
            "Seuls les amis de ce membre peuvent lire et écrire sur son mur.",
          ),
    )}</div></div>`,
  );
}
async function friendsPage(token) {
  const id = demo ? "demo" : user.id,
    rs = await relations(id),
    ps = await people(
      rs.map((r) => (r.sender === id ? r.recipient : r.sender)),
    );
  if (token !== revision) return;
  const pending = rs.filter((r) => r.status === "pending");
  shell(
    `<div class="page-heading"><h1>Mes amis</h1><span>[ les gens qui comptent ]</span></div>${box(
      "Demandes d’amitié",
      pending.length
        ? pending
            .map((r) => {
              const p = ps.find(
                (p) => p.id === (r.sender === id ? r.recipient : r.sender),
              );
              return `<div class="request">${avatar(p, true)}<div><a href="${link(p.id)}"><b>${esc(p.name)}</b></a><p>${r.sender === id ? "Votre demande est en attente." : "souhaite vous ajouter à ses amis."}</p></div>${r.recipient === id ? `<button data-action="accept" data-id="${r.id}">Accepter</button>` : ""}<button class="secondary" data-action="remove-friend" data-id="${r.id}">${r.sender === id ? "Annuler" : "Refuser"}</button></div>`;
            })
            .join("")
        : empty("Aucune demande en attente."),
    )}${box("Tous mes amis", cards(ps.filter((p) => rs.some((r) => r.status === "accepted" && (r.sender === p.id || r.recipient === p.id)))))}<p><a href="#directory">+ Retrouver d’autres amis</a></p>`,
    "friends",
  );
}
async function directoryPage(query, token) {
  const q = query.trim().slice(0, 80);
  let list;
  if (demo)
    list = demoPeople.filter((p) =>
      p.name.toLowerCase().includes(q.toLowerCase()),
    );
  else {
    let req = db
      .from("profiles")
      .select("id,name,school,city,avatar")
      .order("name")
      .limit(60);
    if (q) req = req.ilike("name", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
    list = await result(req);
  }
  if (token !== revision) return;
  shell(
    `<div class="page-heading"><h1>L’annuaire</h1><span>[ retrouvez-vous ]</span></div>${box("Rechercher des personnes", `<form id="directory-form" class="inline-form"><label for="directory-q">Nom ou prénom</label><input id="directory-q" name="q" value="${esc(q)}" maxlength="80"><button>Rechercher</button></form>`)}${box(q ? `Résultats pour « ${esc(q)} »` : "Les membres", list.length ? cards(list) : empty("Aucun membre trouvé. Essayez un autre nom."))}<p class="muted">Les 60 premiers résultats sont affichés. Affinez votre recherche si nécessaire.</p>`,
    "directory",
  );
}
async function editPage(token) {
  const p = demo ? demoPeople[0] : await getProfile(user.id);
  if (token !== revision) return;
  shell(
    `<div class="page-heading"><h1>Modifier mon profil</h1><a href="#profile">retour au profil</a></div>${box(
      "À vous de vous présenter",
      `<form id="edit-form" class="account-form"><div class="edit-photo">${avatar(p, true)}<label>Photo de profil<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><span class="muted">JPEG, PNG ou WebP · 5 Mo maximum</span></label></div>${[
        ["name", "Prénom et nom", 80],
        ["school", "École / université", 120],
        ["city", "Ville", 100],
        ["relationship", "Situation", 80],
        ["interests", "Centres d’intérêt", 500],
      ]
        .map(
          ([n, l, max]) =>
            `<label>${l}<input name="${n}" value="${esc(p[n] || "")}" maxlength="${max}" ${n === "name" ? 'required minlength="2"' : ""}></label>`,
        )
        .join(
          "",
        )}<label>À propos de moi<textarea name="bio" maxlength="1500" rows="4">${esc(p.bio || "")}</textarea></label><label class="check"><input name="remove_photo" type="checkbox"> Supprimer ma photo actuelle</label><button>Enregistrer les modifications</button></form>`,
    )}`,
    "edit",
  );
}
async function messagesPage(otherId, token) {
  if (demo) {
    shell(
      `<div class="page-heading"><h1>Ma messagerie</h1></div>${box("Messages privés", empty("Les messages privés sont disponibles avec un vrai compte."))}`,
      "messages",
    );
    return;
  }
  const rs = await relations(user.id),
    fs = await people(
      rs
        .filter((r) => r.status === "accepted")
        .map((r) => (r.sender === user.id ? r.recipient : r.sender)),
    );
  let req = db
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (otherId)
    req = req.or(
      `and(sender.eq.${user.id},recipient.eq.${otherId}),and(sender.eq.${otherId},recipient.eq.${user.id})`,
    );
  const msgs = await result(req),
    ps = await people([
      ...msgs.flatMap((m) => [m.sender, m.recipient]),
      ...(otherId ? [otherId] : []),
    ]);
  if (token !== revision) return;
  const p = ps.find((p) => p.id === otherId),
    isFriend = fs.some((p) => p.id === otherId);
  const otherIds = [
    ...new Set(
      msgs.map((m) => (m.sender === user.id ? m.recipient : m.sender)),
    ),
  ];
  shell(
    `<div class="page-heading"><h1>${otherId ? esc(p?.name || "Conversation") : "Ma messagerie"}</h1>${otherId ? '<a href="#messages">tous les messages</a>' : "<span>[ entre nous ]</span>"}</div>${box("Écrire à un ami", fs.length ? `<form id="choose-friend" class="inline-form"><label for="recipient">Destinataire</label><select name="recipient" id="recipient">${fs.map((p) => `<option value="${p.id}" ${p.id === otherId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select><button>Ouvrir</button></form>` : empty("Ajoutez des amis pour leur envoyer un message."))}${
      otherId
        ? box(
            "Conversation privée",
            `${isFriend ? `<form id="message-form" data-id="${esc(otherId)}"><label for="message">Votre message</label><textarea id="message" name="body" required maxlength="4000" rows="3"></textarea><div class="composer-bottom"><span>Visible uniquement par vous deux</span><button>Envoyer</button></div></form>` : empty("Vous devez être amis pour envoyer de nouveaux messages.")}<div class="conversation">${
              msgs.length
                ? msgs
                    .slice()
                    .reverse()
                    .map(
                      (m) =>
                        `<article class="message ${m.sender === user.id ? "mine" : ""}"><b>${esc(ps.find((p) => p.id === m.sender)?.name || "Membre")}</b><time>${date(m.created_at)}</time><p>${esc(m.body)}</p></article>`,
                    )
                    .join("")
                : empty("Le début d’une conversation.")
            }</div>`,
          )
        : box(
            "Conversations récentes",
            otherIds.length
              ? otherIds
                  .map((id) => {
                    const p = ps.find((p) => p.id === id),
                      m = msgs.find(
                        (m) => m.sender === id || m.recipient === id,
                      );
                    return `<a class="conversation-row" href="#messages/${id}">${avatar(p, true)}<div><b>${esc(p?.name || "Membre")}</b><p>${esc(m.body.slice(0, 100))}</p><time>${date(m.created_at)}</time></div></a>`;
                  })
                  .join("")
              : empty("Vous n’avez pas encore de messages."),
          )
    }`,
    "messages",
  );
}
function staticPage(page) {
  const content = {
    about: [
      "À propos",
      "Un petit retour en 2005",
      "Retrobook reprend les codes visuels du web social de 2005 : du bleu, des liens, des profils et des amis. Cette reconstitution indépendante possède son propre code et sa propre base de données. Elle ne propose pas de connexion aux comptes Facebook et n’est pas affiliée à Meta.",
    ],
    privacy: [
      "Confidentialité",
      "Qui peut voir quoi ?",
      "Les membres connectés peuvent consulter les profils et les liens d’amitié acceptés. Les e-mails ne figurent jamais dans l’annuaire. Un mur est accessible à son propriétaire et à ses amis. Les messages privés sont réservés à leurs deux participants. Les demandes en attente ne sont visibles que par les personnes concernées. Votre session de connexion est conservée dans ce navigateur ; déconnectez-vous sur un ordinateur partagé. Aucune publicité ni outil de suivi n’est intégré. Les données sont hébergées dans le projet Supabase de l’exploitant. Pour supprimer votre compte et ses données, contactez la personne qui vous a invité sur ce site.",
    ],
    help: [
      "Aide",
      "Comment se retrouver ?",
      "Créez un compte, puis confirmez votre adresse e-mail avec le lien reçu. Complétez votre profil. Cherchez un ami dans l’annuaire et ouvrez son profil pour l’inviter. Une fois la demande acceptée, vous pouvez écrire sur son mur et lui envoyer des messages privés. Les nouveautés apparaissent quand vous rouvrez la page ou utilisez Actualiser. Aucun logiciel n’est nécessaire : partagez simplement l’adresse du site.",
    ],
  }[page];
  shell(
    `<div class="page-heading"><h1>${content[0]}</h1></div>${box(content[1], `<p class="prose">${content[2]}</p>`)}<p><a href="${user || demo ? "#profile" : "#welcome"}">← Retour</a></p>`,
  );
}
async function render() {
  const token = ++revision;
  let [page = "welcome", param = ""] = location.hash.slice(1).split("/");
  try {
    param = decodeURIComponent(param);
    if (page === "demo") {
      demo = true;
      page = "profile";
    }
    if (page === "welcome") demo = false;
    if (["about", "privacy", "help"].includes(page)) {
      staticPage(page);
      return;
    }
    if (recovery && page !== "reset") {
      location.hash = "#reset";
      return;
    }
    if (user && !demo && ["signup", "login"].includes(page)) {
      location.hash = "#profile";
      return;
    }
    if (["signup", "forgot", "reset", "login"].includes(page)) {
      authPage(page);
      return;
    }
    if (!user && !demo) {
      welcome();
      return;
    }
    if (page === "welcome") {
      location.hash = "#profile";
      return;
    }
    if (page === "profile") await profilePage(param, token);
    else if (page === "friends") await friendsPage(token);
    else if (page === "directory") await directoryPage(param, token);
    else if (page === "edit") await editPage(token);
    else if (page === "messages") await messagesPage(param, token);
    else location.hash = "#profile";
  } catch (e) {
    if (token === revision) {
      shell(
        `<div class="page-heading"><h1>Page indisponible</h1></div><p>${esc(friendly(e))}</p><button data-action="refresh">Réessayer</button>`,
      );
    }
  }
}
async function compress(file) {
  if (file.size > 5 * 1024 * 1024)
    throw Error("La photo doit peser moins de 5 Mo.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choisissez une image JPEG, PNG ou WebP.");
  const bitmap = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const scale = Math.min(1, 400 / Math.max(bitmap.width, bitmap.height));
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext("2d").drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c.toDataURL("image/jpeg", 0.8);
}
root.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target,
    d = new FormData(f),
    button = f.querySelector("button");
  if (["search-form", "directory-form"].includes(f.id)) {
    location.hash = "#directory/" + encodeURIComponent(d.get("q").trim());
    return;
  }
  if (f.id === "choose-friend") {
    location.hash = "#messages/" + d.get("recipient");
    return;
  }
  if (demo) {
    notify(
      "Cet aperçu contient des données fictives. Créez un compte pour participer.",
    );
    return;
  }
  if (!configured) {
    notify("Configurez Supabase pour activer les comptes.", true);
    return;
  }
  if (button) button.disabled = true;
  try {
    const kind = f.dataset.auth;
    if (kind === "login") {
      const data = await result(
        db.auth.signInWithPassword({
          email: d.get("email").trim(),
          password: d.get("password"),
        }),
      );
      user = data.session?.user || data.user;
      demo = false;
      location.hash = "#profile";
      await render();
    } else if (kind === "signup") {
      const data = await result(
        db.auth.signUp({
          email: d.get("email").trim(),
          password: d.get("password"),
          options: {
            data: { name: d.get("name").trim() },
            emailRedirectTo: location.origin,
          },
        }),
      );
      if (data.session) {
        user = data.session.user;
        demo = false;
        location.hash = "#profile";
        await render();
      } else {
        notify(
          "Vérifiez votre boîte mail : si l’inscription est possible, vous recevrez un lien de confirmation.",
        );
        f.reset();
      }
    } else if (kind === "forgot") {
      await result(
        db.auth.resetPasswordForEmail(d.get("email"), {
          redirectTo: location.origin + "/#reset",
        }),
      );
      notify(
        "Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé.",
      );
    } else if (kind === "reset") {
      await result(db.auth.updateUser({ password: d.get("password") }));
      recovery = false;
      location.hash = "#profile";
      await render();
      notify("Votre mot de passe a été mis à jour.");
    } else if (f.id === "edit-form") {
      const patch = Object.fromEntries(
        ["name", "school", "city", "relationship", "interests", "bio"].map(
          (k) => [k, d.get(k).trim()],
        ),
      );
      const file = d.get("photo");
      if (d.get("remove_photo")) patch.avatar = "";
      else if (file?.size) patch.avatar = await compress(file);
      await result(db.from("profiles").update(patch).eq("id", user.id));
      location.hash = "#profile";
      await render();
      notify("Profil mis à jour.");
    } else if (f.id === "wall-form") {
      await result(
        db.from("posts").insert({
          author: user.id,
          wall_owner: f.dataset.id,
          body: d.get("body").trim(),
        }),
      );
      await render();
    } else if (f.id === "message-form") {
      await result(
        db.from("messages").insert({
          sender: user.id,
          recipient: f.dataset.id,
          body: d.get("body").trim(),
        }),
      );
      await render();
      notify("Message envoyé.");
    }
  } catch (err) {
    notify(friendly(err), true);
  } finally {
    if (button) button.disabled = false;
  }
});
root.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  e.preventDefault();
  const action = b.dataset.action,
    id = b.dataset.id;
  if (action === "exit-demo") {
    demo = false;
    location.hash = "#signup";
    return;
  }
  if (action === "refresh") {
    await render();
    return;
  }
  if (action === "logout") {
    demo = false;
    if (db && user) {
      const { error } = await db.auth.signOut();
      if (error) {
        notify(friendly(error), true);
        return;
      }
    }
    user = null;
    location.hash = "#welcome";
    await render();
    return;
  }
  if (demo) {
    notify(
      "Action disponible avec un vrai compte. Les profils de cet aperçu sont fictifs.",
    );
    return;
  }
  b.disabled = true;
  try {
    if (action === "add-friend")
      await result(
        db.from("friendships").insert({ sender: user.id, recipient: id }),
      );
    if (action === "accept")
      await result(db.rpc("accept_friend", { request_id: id }));
    if (action === "remove-friend")
      await result(db.from("friendships").delete().eq("id", id));
    if (action === "delete-post")
      await result(db.from("posts").delete().eq("id", id));
    if (action === "poke")
      await result(db.from("pokes").insert({ sender: user.id, recipient: id }));
    if (action === "dismiss-poke")
      await result(
        db.from("pokes").delete().eq("sender", id).eq("recipient", user.id),
      );
    await render();
    notify(action === "poke" ? "Poke envoyé !" : "Modification enregistrée.");
  } catch (err) {
    notify(friendly(err), true);
  } finally {
    b.disabled = false;
  }
});
window.addEventListener("hashchange", render);
if (db) {
  db.auth.onAuthStateChange((event, session) => {
    const previousUserId = user?.id;
    user = session?.user || null;
    if (event === "SIGNED_OUT") recovery = false;
    if (event === "PASSWORD_RECOVERY") {
      recovery = true;
      location.hash = "#reset";
    }
    // A token refresh or tab refocus must not erase a message being typed.
    if (
      previousUserId !== user?.id ||
      event === "PASSWORD_RECOVERY" ||
      event === "USER_UPDATED"
    ) {
      setTimeout(render, 0);
    }
  });
  const { data, error } = await db.auth.getSession();
  user = data.session?.user || null;
  await render();
  if (error) notify(friendly(error), true);
} else await render();
