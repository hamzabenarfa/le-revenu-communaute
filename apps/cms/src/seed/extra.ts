/**
 * Extra demo content on top of the prototype fixture, so the feed, spaces and
 * paging have volume. Pseudonymous members, no real personal data. Numbers
 * (dates, views, "Utile") are derived from the position: the seed stays repeatable.
 */

type TopicType = 'question' | 'discussion' | 'poll';

interface Draft {
  c: string;
  t: TopicType;
  a: string;
  title: string;
  body: string;
  poll?: string[];
  /** Index of the best answer in `r`. */
  sol?: number;
  /** Index of a reply verified by the newsroom. */
  ver?: number;
  r: Array<[author: string, content: string]>;
}

const USERS = [
  ['Antoine_Bordeaux', 'Antoine', '#0f766e', 'Ingénieur, 34 ans, je construis mon patrimoine pas à pas.', ['bourse', 'immobilier']],
  ['Isabelle.M', 'Isabelle', '#9333ea', 'Professeure des écoles, deux enfants, épargnante prudente.', ['epargne', 'budget']],
  ['FredDividendes', 'Frédéric', '#b45309', "Investisseur en actions à dividendes depuis quinze ans.", ['bourse']],
  ['Lucie_Lille', 'Lucie', '#db2777', 'Premier emploi, premier livret, premières questions !', ['budget', 'epargne']],
  ['Pierre_Expat', 'Pierre', '#2563eb', 'Expatrié à Montréal, je garde un pied dans le patrimoine français.', ['impots', 'assurance-vie']],
  ['Gaelle_Rennes', 'Gaëlle', '#16a34a', 'Indépendante, je prépare ma retraite seule.', ['retraite', 'impots']],
  ['Yann_Brest', 'Yann', '#0891b2', 'Propriétaire bailleur de deux petits appartements.', ['immobilier']],
  ['Elodie.Budget', 'Élodie', '#e11d48', "Je tiens mes comptes au centime, et j'aime partager mes méthodes.", ['budget']],
  ['Hugo_Alternatif', 'Hugo', '#7c3aed', 'Curieux des placements hors des sentiers battus, avec prudence.', ['alternatifs', 'bourse']],
  ['Francoise63', 'Françoise', '#ca8a04', 'Retraitée auvergnate, je pense à la transmission.', ['transmission', 'retraite']],
  ['Mehdi_Paris', 'Mehdi', '#4f46e5', 'Jeune cadre, je cherche à acheter ma résidence principale.', ['immobilier', 'economie']],
  ['Agnes.Senior', 'Agnès', '#be123c', 'Veuve depuis peu, j’apprends à gérer seule notre patrimoine.', ['assurance-vie', 'transmission']],
] as const;

const DRAFTS: Draft[] = [
  // ------------------------------------------------------------------ Bourse
  {
    c: 'bourse', t: 'question', a: 'Antoine_Bordeaux',
    title: 'ETF monde ou S&P 500 dans un PEA : lequel choisir pour vingt ans ?',
    body: "Je verse 300 € par mois sur mon PEA. J'hésite entre un ETF MSCI World et un ETF S&P 500.\n\nLe S&P a mieux performé ces dernières années, mais j'ai peur de trop dépendre des États-Unis. Comment raisonnez-vous ?",
    sol: 1, ver: 1,
    r: [
      ['FredDividendes', "Personne ne sait quelle zone fera le mieux sur vingt ans. Le passé récent n'est pas une garantie."],
      ['Vincent_ETF', "Le MSCI World contient déjà environ 70 % d'actions américaines. Le choisir, c'est garder les États-Unis tout en se diversifiant un peu.\n\nPour un horizon long et un versement programmé, la simplicité d'une seule ligne monde est un vrai atout : moins de décisions, moins d'erreurs."],
      ['Antoine_Bordeaux', 'Merci, je pars sur le monde. Une ligne, et on n’y touche plus.'],
    ],
  },
  {
    c: 'bourse', t: 'discussion', a: 'FredDividendes',
    title: 'Mon portefeuille dividendes après quinze ans : bilan et erreurs',
    body: "Quinze ans que je construis un portefeuille d'actions françaises à dividendes. Aujourd'hui, les dividendes couvrent mes impôts locaux et mes vacances.\n\nMes erreurs : trop de bancaires en 2008, et une ligne qui a coupé son dividende deux fois. La leçon : diversifier les secteurs, pas seulement les noms.",
    r: [
      ['PapyBoursier', 'Même constat ici. Un dividende élevé est parfois un signal d’alerte, pas une bonne affaire.'],
      ['Thomas_PEA', 'Vous réinvestissez les dividendes ou vous les dépensez ?'],
      ['FredDividendes', "Réinvestis pendant douze ans, dépensés depuis trois. C'était le plan dès le départ."],
      ['Sophie.Invest', 'Très inspirant, merci pour la transparence sur les erreurs.'],
    ],
  },
  {
    c: 'bourse', t: 'question', a: 'Lucie_Lille',
    title: "Que se passe-t-il pour mon PEA si mon courtier fait faillite ?",
    body: "J'ai ouvert mon PEA chez un courtier en ligne récent. Une collègue m'a fait peur : si le courtier disparaît, est-ce que je perds tout ?",
    sol: 0,
    r: [
      ['Sandrine_CGP', "Non : les titres que vous détenez restent à votre nom, ils sont conservés séparément des comptes du courtier. Il existe en plus un mécanisme de garantie des titres et des espèces en cas de défaillance. Le vrai désagrément serait le délai de transfert."],
      ['Lucie_Lille', 'Ouf, merci ! Je dormirai mieux ce soir.'],
    ],
  },
  {
    c: 'bourse', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : à quelle fréquence regardez-vous votre portefeuille ?',
    body: 'Les études montrent que consulter trop souvent son portefeuille pousse à agir trop. Et vous ?',
    poll: ['Tous les jours', 'Une fois par semaine', 'Une fois par mois', 'Quelques fois par an'],
    r: [
      ['Vincent_ETF', 'Une fois par mois, le jour du versement. Pas plus.'],
      ['PapyBoursier', "Tous les jours, je l'avoue. Mais je n'agis presque jamais !"],
    ],
  },
  {
    c: 'bourse', t: 'question', a: 'Mehdi_Paris',
    title: 'Compte-titres ou PEA pour des actions américaines en direct ?',
    body: "Je veux acheter quelques actions américaines en direct. Le PEA ne les accepte pas, je crois. Le compte-titres est-il la seule solution, et comment sont imposés les dividendes ?",
    sol: 1,
    r: [
      ['Thomas_PEA', 'Oui, actions américaines en direct = compte-titres.'],
      ['Sandrine_CGP', "Exact. Sur le compte-titres, les dividendes américains subissent une retenue à la source, en partie imputable sur l'impôt français grâce à la convention fiscale. Le reste suit la flat tax ou le barème sur option. Pensez au formulaire de résidence fiscale proposé par le courtier pour bénéficier du taux réduit."],
      ['Mehdi_Paris', 'Parfait, je vais vérifier ce formulaire avec mon courtier.'],
    ],
  },
  {
    c: 'bourse', t: 'discussion', a: 'Hugo_Alternatif',
    title: 'Investir régulièrement quand les marchés sont au plus haut : vous continuez ?',
    body: "Les indices enchaînent les records. J'ai du mal à continuer mes versements mensuels, j'ai l'impression d'acheter trop cher. Vous tenez bon ?",
    r: [
      ['Vincent_ETF', "Les marchés passent beaucoup de temps près de leurs plus hauts. Attendre une baisse, c'est souvent rater la hausse."],
      ['Claire_Nantes', "Je continue, c'est justement l'intérêt du versement programmé : ne pas se poser la question."],
      ['JeuneEpargnant', "Pareil, je regarde le moins possible et j'automatise."],
    ],
  },
  {
    c: 'bourse', t: 'question', a: 'Isabelle.M',
    title: 'Les frais de mon PEA bancaire sont-ils normaux ?',
    body: "Ma banque me prélève des droits de garde et 0,5 % par ordre avec un minimum de 8 €. J'achète 100 € par mois. Est-ce que je me fais avoir ?",
    sol: 1,
    r: [
      ['Bertrand59', "8 € sur 100 €, c'est 8 % de frais d'entrée. C'est énorme."],
      ['Vincent_ETF', "Pour de petits versements réguliers, les frais minimums par ordre pèsent lourd. Deux pistes : regrouper vos achats (300 € par trimestre), ou transférer le PEA chez un courtier en ligne. Le transfert garde l'antériorité fiscale, mais vérifiez ses frais."],
      ['Isabelle.M', 'Je ne savais pas que le transfert gardait la date. Merci !'],
    ],
  },
  // ---------------------------------------------------------------- Épargne
  {
    c: 'epargne', t: 'question', a: 'Lucie_Lille',
    title: "Livret A plein : où placer la suite de mon épargne de précaution ?",
    body: "Mon Livret A est au plafond. J'ai encore 4 000 € qui dorment sur mon compte courant. Je veux garder cet argent disponible. Quelles options ?",
    sol: 0, ver: 0,
    r: [
      ['Odile.Retraite', "Si vous y avez droit, le LEP rapporte plus que le Livret A, sous conditions de revenus. Sinon le LDDS, avec le même taux que le Livret A, disponible à tout moment."],
      ['Isabelle.M', "Le LDDS, c'est ce que j'ai fait. Simple et sans risque."],
      ['Lucie_Lille', "Je vérifie mon éligibilité au LEP, je n'y avais pas pensé."],
    ],
  },
  {
    c: 'epargne', t: 'discussion', a: 'Elodie.Budget',
    title: "Combien de mois de dépenses gardez-vous en épargne de précaution ?",
    body: "On lit souvent « trois à six mois de dépenses ». Moi j'en garde huit parce que je suis à mon compte. Et vous, comment avez-vous fixé votre chiffre ?",
    r: [
      ['Gaelle_Rennes', 'Indépendante aussi : douze mois. Les revenus irréguliers imposent plus de marge.'],
      ['Thomas_PEA', 'Trois mois, en CDI dans une grande entreprise.'],
      ['Claire_Nantes', "Six mois, et une ligne séparée pour les grosses dépenses prévues (voiture, travaux)."],
    ],
  },
  {
    c: 'epargne', t: 'question', a: 'Isabelle.M',
    title: "Ouvrir un livret pour mes enfants : Livret A ou Livret Jeune ?",
    body: "Mes enfants ont 9 et 13 ans. Je veux leur mettre un peu de côté chaque mois. Quel support choisir ?",
    sol: 1,
    r: [
      ['Lucie_Lille', "J'avais un Livret Jeune ado, je crois que c'est à partir de 12 ans."],
      ['Odile.Retraite', "Le Livret Jeune est réservé aux 12-25 ans et son taux est au moins égal à celui du Livret A, parfois plus selon la banque. Pour le plus jeune, un Livret A à son nom. Pour un horizon long (études), une assurance-vie ouverte au nom de l'enfant peut aussi se discuter."],
      ['Isabelle.M', 'Super, Livret Jeune pour l’aîné, Livret A pour le cadet.'],
    ],
  },
  {
    c: 'epargne', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : épargnez-vous un montant fixe chaque mois ?',
    body: 'Virement automatique en début de mois, ou épargne de ce qui reste ? Dites-nous comment vous faites.',
    poll: ['Oui, virement automatique', 'Oui, mais à la main', "J'épargne ce qui reste", "Je n'arrive pas à épargner"],
    r: [
      ['Elodie.Budget', 'Virement automatique le jour de la paie. Ce qu’on ne voit pas, on ne le dépense pas.'],
      ['JeuneEpargnant', 'Ce qui reste… et il ne reste pas grand-chose 😅'],
    ],
  },
  {
    c: 'epargne', t: 'question', a: 'Agnes.Senior',
    title: 'Comptes à terme : est-ce encore intéressant ?',
    body: "Mon conseiller me propose un compte à terme sur deux ans. Je n'ai jamais utilisé ce produit. Quels sont les pièges ?",
    sol: 0,
    r: [
      ['Sandrine_CGP', "Le principal piège : l'argent est bloqué, ou la sortie anticipée est pénalisée. Comparez le taux net d'impôt avec un livret réglementé, qui est défiscalisé. Et vérifiez si le taux est fixe ou progressif : les offres progressives affichent souvent le meilleur taux de la dernière période."],
      ['Agnes.Senior', 'Merci, je vais lui demander le taux réel sur toute la durée.'],
    ],
  },
  // ---------------------------------------------------------- Assurance-vie
  {
    c: 'assurance-vie', t: 'question', a: 'Pierre_Expat',
    title: "Garder son assurance-vie française quand on part vivre à l'étranger",
    body: "Je pars m'installer au Canada pour plusieurs années. Dois-je clôturer mon assurance-vie ? Puis-je continuer à verser ?",
    sol: 1, ver: 1,
    r: [
      ['LeRentier', "J'ai gardé la mienne pendant mon expatriation, aucun problème pour la conserver."],
      ['Sandrine_CGP', "Rien n'oblige à clôturer, et le contrat garde son antériorité fiscale. En revanche, certains assureurs refusent les nouveaux versements de non-résidents selon le pays, et la fiscalité des rachats dépendra de votre pays de résidence et de la convention fiscale. Prévenez l'assureur de votre changement d'adresse."],
      ['Pierre_Expat', "Très clair, je contacte l'assureur avant de partir."],
    ],
  },
  {
    c: 'assurance-vie', t: 'discussion', a: 'Nadia.Patrimoine',
    title: "Rédiger sa clause bénéficiaire : vos retours d'expérience",
    body: "J'ai découvert que ma clause était la clause standard « mon conjoint, à défaut mes enfants ». Je me demande si elle convient vraiment à notre famille recomposée. Comment avez-vous fait ?",
    r: [
      ['Me_Garnier', "Dans une famille recomposée, la clause standard mérite souvent d'être revue. Une clause sur mesure, éventuellement déposée chez un notaire, permet de préciser qui reçoit quoi."],
      ['Francoise63', "Nous l'avons fait avec notre notaire, et ça nous a vraiment rassurés."],
      ['Nadia.Patrimoine', 'Je prends rendez-vous, merci pour vos retours.'],
    ],
  },
  {
    c: 'assurance-vie', t: 'question', a: 'Agnes.Senior',
    title: "Mon mari avait une assurance-vie : comment savoir si j'en suis bénéficiaire ?",
    body: "Mon mari est décédé il y a trois mois. Je ne retrouve pas tous ses papiers. Comment savoir s'il avait des contrats à mon nom ?",
    sol: 0, ver: 0,
    r: [
      ['LaRedaction', "Toutes nos condoléances. Un service gratuit permet de rechercher les contrats d'assurance-vie dont on pense être bénéficiaire : il transmet la demande aux assureurs, qui reviennent vers vous s'ils trouvent un contrat. Le notaire chargé de la succession peut aussi interroger le fichier des contrats."],
      ['Odile.Retraite', "Courage à vous. Le notaire m'avait beaucoup aidée dans la même situation."],
      ['Agnes.Senior', 'Merci infiniment pour ces pistes concrètes.'],
    ],
  },
  {
    c: 'assurance-vie', t: 'question', a: 'Claire_Nantes',
    title: "Fonds euros ou unités de compte à 45 ans : quelle répartition ?",
    body: "J'ai 45 ans, un horizon de 15 ans avant la retraite. Mon contrat est à 100 % en fonds euros. Est-ce trop prudent ?",
    r: [
      ['Vincent_ETF', "À 15 ans d'horizon, une part en unités de compte diversifiées se défend, à condition d'accepter de voir le contrat baisser certaines années."],
      ['PapyBoursier', "La gestion à horizon, qui sécurise progressivement, peut être un bon compromis si vous ne voulez pas gérer."],
    ],
  },
  {
    c: 'assurance-vie', t: 'poll', a: 'LaRedaction',
    title: "Sondage : combien de contrats d'assurance-vie avez-vous ?",
    body: 'Un seul contrat bien choisi, ou plusieurs pour diversifier les assureurs ?',
    poll: ['Aucun', 'Un seul', 'Deux ou trois', 'Plus de trois'],
    r: [['LeRentier', "Trois : un ancien contrat bancaire pour l'antériorité, deux contrats en ligne."]],
  },
  // -------------------------------------------------------------- Immobilier
  {
    c: 'immobilier', t: 'question', a: 'Mehdi_Paris',
    title: 'Premier achat : quel apport viser pour obtenir un bon taux ?',
    body: "Je vise un appartement à 280 000 €. J'ai 25 000 € d'épargne. Les banques demandent-elles toujours 10 % d'apport ?",
    sol: 1,
    r: [
      ['Karim_Immo', "Dans la pratique, oui, les banques aiment que l'apport couvre au moins les frais de notaire et de garantie."],
      ['Yann_Brest', "D'après mon expérience récente : avec 25 000 €, vous couvrez à peu près les frais. Le reste du dossier compte beaucoup : stabilité de l'emploi, comptes bien tenus, épargne résiduelle après l'achat. Faites jouer la concurrence ou passez par un courtier."],
      ['Mehdi_Paris', 'Je vais garder une épargne de côté après achat, bon conseil.'],
    ],
  },
  {
    c: 'immobilier', t: 'discussion', a: 'Yann_Brest',
    title: 'Locataire en impayé : mon expérience et ce que je ferais autrement',
    body: "Six mois d'impayés sur un de mes studios. Tout s'est terminé à l'amiable, mais j'ai appris beaucoup.\n\nAujourd'hui je prendrais systématiquement une garantie loyers impayés, et je réagirais dès le premier retard plutôt que d'attendre.",
    r: [
      ['Karim_Immo', "Merci pour ce partage. La GLI a un coût, mais c'est une tranquillité d'esprit."],
      ['Bertrand59', "Réagir vite, c'est la clé. Souvent le locataire a un problème ponctuel qui se règle si on en parle tôt."],
      ['Marc_Lyon', 'Ça refroidit un peu mon projet de location…'],
      ['Yann_Brest', "Il ne faut pas ! C'est un incident en dix ans. Il faut juste être préparé."],
    ],
  },
  {
    c: 'immobilier', t: 'question', a: 'Antoine_Bordeaux',
    title: 'SCPI à crédit : bonne ou mauvaise idée en ce moment ?',
    body: "Un conseiller me propose d'acheter des parts de SCPI à crédit sur 15 ans. Les revenus rembourseraient une partie du prêt. Qu'en pensez-vous ?",
    sol: 0,
    r: [
      ['Sandrine_CGP', "Le montage peut fonctionner, mais regardez trois points : les frais d'entrée (souvent autour de 10 %), la fiscalité des loyers dans votre tranche d'imposition, et la liquidité des parts. Les prix de part peuvent aussi baisser, comme on l'a vu récemment."],
      ['LeRentier', "J'ajouterais : ne pas tout mettre sur une seule SCPI."],
    ],
  },
  {
    c: 'immobilier', t: 'question', a: 'Marc_Lyon',
    title: 'Renégocier son prêt immobilier : à partir de quel écart de taux ?',
    body: "J'ai emprunté à un taux élevé il y a deux ans. Les taux ont un peu baissé. À partir de quel écart une renégociation vaut-elle le coup ?",
    sol: 1,
    r: [
      ['Karim_Immo', "On parle souvent d'un point d'écart, mais tout dépend du capital restant et de la durée."],
      ['Yann_Brest', "Faites le calcul complet : indemnités de remboursement anticipé, nouveaux frais de garantie et de dossier. Commencez par demander une renégociation à votre propre banque : c'est plus simple et elle préfère souvent baisser le taux que vous perdre."],
    ],
  },
  {
    c: 'immobilier', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : pensez-vous que les prix de l’immobilier vont baisser cette année ?',
    body: 'Votre avis sur votre ville : dites-nous en commentaire où vous habitez.',
    poll: ['Oui, nettement', 'Un peu', 'Ils vont stagner', 'Ils vont remonter'],
    r: [
      ['Mehdi_Paris', "À Paris, ça stagne. J'attends encore un peu."],
      ['Yann_Brest', 'À Brest, ça remonte doucement.'],
    ],
  },
  // ------------------------------------------------------------------ Impôts
  {
    c: 'impots', t: 'question', a: 'Gaelle_Rennes',
    title: "Micro-entreprise : versement libératoire ou barème classique ?",
    body: "Je suis en micro-entreprise depuis un an. On me propose l'option du versement libératoire de l'impôt. Comment savoir si c'est avantageux ?",
    sol: 0, ver: 0,
    r: [
      ['LaRedaction', "Le versement libératoire est souvent intéressant si votre taux marginal d'imposition est élevé, et il n'est accessible que sous un plafond de revenu fiscal de référence. Faites une simulation de votre impôt avec et sans l'option sur le simulateur officiel."],
      ['Gaelle_Rennes', "Je fais la simulation ce week-end, merci."],
    ],
  },
  {
    c: 'impots', t: 'question', a: 'Pierre_Expat',
    title: "Déclarer ses comptes à l'étranger : obligatoire même s'ils sont vides ?",
    body: "J'ai un compte bancaire au Canada avec très peu d'argent dessus. Dois-je le déclarer dans ma déclaration française ?",
    sol: 1,
    r: [
      ['Bertrand59', "Il me semble que oui, quel que soit le solde."],
      ['Sandrine_CGP', "Oui : tant que vous êtes résident fiscal français, chaque compte ouvert, détenu, utilisé ou clos à l'étranger doit être déclaré, même avec un faible solde. L'oubli est sanctionné par une amende par compte non déclaré."],
      ['Pierre_Expat', "Merci, je le rajoute dès cette année."],
    ],
  },
  {
    c: 'impots', t: 'discussion', a: 'Bertrand59',
    title: "Dons aux associations : vous les déduisez tous ?",
    body: "Je fais quelques dons par an et je découvre qu'ils ouvrent droit à une réduction d'impôt. Vous pensez systématiquement à garder vos reçus ?",
    r: [
      ['Isabelle.M', 'Oui, et la plupart des associations envoient le reçu automatiquement en début d’année.'],
      ['Francoise63', "Attention à bien les reporter dans la bonne case, l'an dernier je les avais oubliés !"],
    ],
  },
  {
    c: 'impots', t: 'question', a: 'Mehdi_Paris',
    title: 'Prélèvement à la source : changer de taux après une augmentation ?',
    body: "Mon salaire a augmenté de 15 % en début d'année. Mon taux de prélèvement est toujours le même. Dois-je l'actualiser moi-même ?",
    sol: 0,
    r: [
      ['Gaelle_Rennes', "Vous pouvez actualiser votre taux dans votre espace en ligne. Sinon, la régularisation se fera l'été suivant, avec un rappel d'impôt à payer en une fois. Actualiser maintenant évite la mauvaise surprise."],
      ['Mehdi_Paris', "Je préfère lisser, je fais la démarche."],
    ],
  },
  {
    c: 'impots', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : faites-vous votre déclaration de revenus vous-même ?',
    body: 'Déclaration automatique, en ligne, avec un proche ou un professionnel ?',
    poll: ['Déclaration automatique', 'En ligne, seul', 'Avec un proche', 'Avec un professionnel'],
    r: [['Elodie.Budget', 'En ligne, seule, avec un tableur à côté pour tout vérifier.']],
  },
  // ---------------------------------------------------------------- Retraite
  {
    c: 'retraite', t: 'question', a: 'Gaelle_Rennes',
    title: 'PER individuel quand on est indépendant : quel montant verser ?',
    body: "Mes revenus varient beaucoup d'une année à l'autre. Comment décider du montant à verser sur mon PER ?",
    sol: 1, ver: 1,
    r: [
      ['Odile.Retraite', "J'ai choisi de verser surtout les bonnes années."],
      ['Sandrine_CGP', "C'est une bonne stratégie : les versements déductibles sont surtout intéressants quand votre tranche d'imposition est élevée. Les années creuses, l'avantage fiscal est plus faible. Gardez en tête que l'argent est bloqué jusqu'à la retraite, sauf cas particuliers comme l'achat de la résidence principale."],
      ['Gaelle_Rennes', 'Logique. Je cale mes versements sur mes bonnes années.'],
    ],
  },
  {
    c: 'retraite', t: 'discussion', a: 'Odile.Retraite',
    title: 'Un an de retraite : ce qui a changé dans mon budget',
    body: "Retraitée depuis un an. Mes revenus ont baissé d'un tiers, mais certaines dépenses aussi : transport, repas à l'extérieur, vêtements. En revanche, santé et voyages ont augmenté.\n\nJe conseille de tester son budget « retraite » un an avant le départ.",
    r: [
      ['Francoise63', 'Tout à fait mon expérience. La mutuelle coûte bien plus cher après le départ.'],
      ['Gaelle_Rennes', 'Merci, très utile pour se projeter.'],
      ['Helene_R', 'Tester le budget avant, excellente idée !'],
    ],
  },
  {
    c: 'retraite', t: 'question', a: 'Antoine_Bordeaux',
    title: 'Vérifier son relevé de carrière : à quel âge et comment ?',
    body: "J'ai 34 ans. Est-ce trop tôt pour vérifier mon relevé de carrière ? J'ai eu plusieurs jobs étudiants.",
    sol: 0,
    r: [
      ['Odile.Retraite', "Jamais trop tôt ! Le relevé est consultable en ligne sur le site officiel de la retraite. Les jobs étudiants et périodes à l'étranger manquent souvent : plus vous les signalez tôt, plus il est facile de retrouver les justificatifs."],
      ['Antoine_Bordeaux', "Effectivement, il manque deux étés. Je vais chercher mes fiches de paie."],
    ],
  },
  {
    c: 'retraite', t: 'poll', a: 'LaRedaction',
    title: "Sondage : à quel âge souhaitez-vous partir à la retraite ?",
    body: 'Et avez-vous commencé à préparer ce départ financièrement ?',
    poll: ['Avant 60 ans', 'Entre 60 et 62 ans', 'Entre 62 et 64 ans', 'Après 64 ans'],
    r: [['JeuneEpargnant', "Avant 60 ans, c'est mon objectif. On verra si c'est réaliste !"]],
  },
  {
    c: 'retraite', t: 'question', a: 'Francoise63',
    title: 'Pension de réversion : quelles démarches après un décès ?',
    body: "Une amie vient de perdre son mari. Elle ne sait pas si elle a droit à une pension de réversion ni à qui s'adresser.",
    sol: 0,
    r: [
      ['Odile.Retraite', "La demande se fait en ligne, en une seule fois pour tous les régimes de retraite du défunt. Les conditions varient selon les régimes (ressources, remariage). Le plus important : faire la demande rapidement."],
      ['Agnes.Senior', "Je suis passée par là, la démarche en ligne est assez simple. Courage à votre amie."],
    ],
  },
  // ----------------------------------------------------------- Transmission
  {
    c: 'transmission', t: 'question', a: 'Francoise63',
    title: 'Donner de l’argent à ses petits-enfants : quelles limites ?',
    body: "Je voudrais aider mes quatre petits-enfants à financer leurs études. Combien puis-je leur donner sans droits ?",
    sol: 1, ver: 1,
    r: [
      ['Nadia.Patrimoine', 'Il y a un abattement spécifique pour les petits-enfants, renouvelable tous les quinze ans.'],
      ['Me_Garnier', "Chaque grand-parent dispose d'un abattement par petit-enfant, renouvelable tous les quinze ans, auquel peut s'ajouter le don familial de sommes d'argent sous conditions d'âge. Pensez à déclarer le don, même exonéré, pour faire courir le délai de quinze ans."],
      ['Francoise63', 'Merci Maître, je vais déclarer chaque don.'],
    ],
  },
  {
    c: 'transmission', t: 'discussion', a: 'Me_Garnier',
    title: "Préparer sa succession : les cinq questions à se poser à 60 ans",
    body: "Quelques questions que je pose à mes clients :\n\n- Qui voulez-vous protéger en priorité ?\n- Votre conjoint est-il suffisamment protégé ?\n- Vos clauses bénéficiaires sont-elles à jour ?\n- Avez-vous un testament ?\n- Avez-vous pensé aux donations de votre vivant ?",
    r: [
      ['Francoise63', "Très utile. La question du conjoint, on n'y avait jamais vraiment réfléchi."],
      ['Nadia.Patrimoine', 'Je partage avec mes parents, merci !'],
      ['Agnes.Senior', "J'aurais aimé lire ça avant… Prenez le temps d'en parler."],
    ],
  },
  {
    c: 'transmission', t: 'question', a: 'Nadia.Patrimoine',
    title: "Démembrement de propriété : comment ça marche concrètement ?",
    body: "Notre notaire nous parle de donner la nue-propriété de notre maison à nos enfants. Je ne comprends pas bien ce que nous gardons.",
    sol: 0,
    r: [
      ['Me_Garnier', "Vous gardez l'usufruit : vous habitez la maison ou la louez et percevez les loyers jusqu'à votre décès. Les enfants reçoivent la nue-propriété, taxée sur une valeur réduite qui dépend de votre âge. Au décès, ils deviennent pleins propriétaires sans droits supplémentaires."],
      ['Nadia.Patrimoine', "C'est beaucoup plus clair, merci."],
    ],
  },
  {
    c: 'transmission', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : avez-vous rédigé un testament ?',
    body: 'Un sujet souvent repoussé. Où en êtes-vous ?',
    poll: ['Oui, chez un notaire', 'Oui, seul', 'Pas encore, mais j’y pense', 'Non'],
    r: [['Francoise63', "Chez le notaire, l'an dernier. Un poids en moins."]],
  },
  // ------------------------------------------------------------- Économie
  {
    c: 'economie', t: 'discussion', a: 'PapyBoursier',
    title: "Inflation qui ralentit : qu'est-ce que ça change pour nos placements ?",
    body: "L'inflation se calme. Les taux des livrets vont baisser, les obligations redeviennent intéressantes ? J'aimerais vos analyses.",
    r: [
      ['Vincent_ETF', 'Les livrets réglementés suivent l’inflation avec retard : leur taux devrait baisser.'],
      ['LeRentier', "J'ai commencé à allonger la durée de mes placements obligataires pour garder les rendements actuels."],
      ['Hugo_Alternatif', "Pour moi rien ne change : épargne de précaution sur livrets, le reste en actions sur le long terme."],
    ],
  },
  {
    c: 'economie', t: 'question', a: 'JeuneEpargnant',
    title: "Pourquoi les taux de la BCE influencent-ils mon crédit immobilier ?",
    body: "On parle beaucoup des décisions de la BCE aux infos. Concrètement, quel est le lien avec le taux de mon futur crédit ?",
    sol: 0, ver: 0,
    r: [
      ['LaRedaction', "Les taux directeurs de la BCE déterminent le coût auquel les banques se financent. Les taux des crédits immobiliers suivent surtout les taux d'emprunt à long terme, eux-mêmes influencés par les anticipations sur la politique de la BCE. Le lien existe, mais avec un décalage."],
      ['JeuneEpargnant', 'Merci, enfin une explication claire !'],
    ],
  },
  {
    c: 'economie', t: 'poll', a: 'LaRedaction',
    title: "Sondage : votre pouvoir d'achat a-t-il progressé cette année ?",
    body: "Hausses de salaire, prix de l'énergie, alimentation : comment le ressentez-vous ?",
    poll: ['Il a progressé', 'Il est stable', 'Il a un peu baissé', 'Il a nettement baissé'],
    r: [['Elodie.Budget', 'Stable, mais seulement parce que j’ai traqué chaque abonnement inutile.']],
  },
  {
    c: 'economie', t: 'discussion', a: 'Marc_Lyon',
    title: 'Les livres d’économie qui vous ont vraiment aidés',
    body: "Je cherche des lectures accessibles pour mieux comprendre l'économie et la finance. Quels livres recommandez-vous ?",
    r: [
      ['PapyBoursier', "Les classiques sur l'investissement passif m'ont beaucoup apporté. Et les dossiers du Revenu, bien sûr !"],
      ['Sophie.Invest', "Je conseille de commencer par l'histoire des crises financières : on relativise beaucoup."],
      ['Antoine_Bordeaux', 'Merci pour ce sujet, je note tout.'],
    ],
  },
  // --------------------------------------------------------- Alternatifs
  {
    c: 'alternatifs', t: 'question', a: 'Hugo_Alternatif',
    title: "Or physique ou ETF or : que choisir pour 5 % du patrimoine ?",
    body: "Je veux une petite poche en or comme assurance. Pièces chez moi ou ETF adossé à de l'or physique ?",
    sol: 1,
    r: [
      ['PapyBoursier', "J'ai quelques pièces, mais le stockage et la revente ne sont pas si simples."],
      ['Sophie.Invest', "Les deux se défendent. L'or physique protège d'un scénario extrême mais coûte en stockage et en écart achat-revente, et sa fiscalité est spécifique. Le support coté est plus simple et liquide. Pour 5 % du patrimoine, la simplicité l'emporte souvent."],
      ['Hugo_Alternatif', 'Je pars sur le support coté, merci.'],
    ],
  },
  {
    c: 'alternatifs', t: 'discussion', a: 'Hugo_Alternatif',
    title: "Crowdfunding immobilier : mon bilan après vingt projets",
    body: "Vingt projets financés, quinze remboursés à l'heure, trois en retard, deux en difficulté. Le rendement affiché n'est pas le rendement réel : il faut compter les retards et les pertes.",
    r: [
      ['Karim_Immo', 'Merci pour ce bilan honnête. Les retards semblent fréquents en ce moment.'],
      ['Bertrand59', "Deux projets en difficulté sur vingt, c'est beaucoup. Ça confirme qu'il faut diversifier."],
      ['Hugo_Alternatif', "Exactement, jamais plus de 2 % de la poche par projet."],
    ],
  },
  {
    c: 'alternatifs', t: 'question', a: 'JeuneEpargnant',
    title: 'Investir dans le vin ou les montres : passion ou placement ?',
    body: "Un ami investit dans des bouteilles de grands vins. Est-ce un vrai placement ou une passion déguisée ?",
    r: [
      ['LeRentier', "Plutôt une passion. Frais de stockage, d'assurance, de revente : la rentabilité n'est pas garantie."],
      ['Hugo_Alternatif', "Si on n'aime pas le vin, c'est une mauvaise idée. Si on l'aime, on peut toujours le boire !"],
    ],
  },
  {
    c: 'alternatifs', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : détenez-vous des placements dits alternatifs ?',
    body: 'Or, forêts, crowdfunding, art, vin… Dites-nous ce que vous détenez.',
    poll: ['Or', 'Crowdfunding', 'Forêts ou vignes', 'Aucun'],
    r: [['Bertrand59', 'Un peu d’or, hérité de mes parents. Rien d’autre.']],
  },
  // --------------------------------------------------------------- Budget
  {
    c: 'budget', t: 'discussion', a: 'Elodie.Budget',
    title: 'Ma méthode des enveloppes, version numérique',
    body: "Je divise mon salaire en enveloppes : charges fixes, courses, loisirs, épargne, imprévus. Chaque enveloppe a son sous-compte bancaire.\n\nRésultat : plus de découvert depuis deux ans, et j'épargne 15 % de mes revenus.",
    r: [
      ['Lucie_Lille', 'Je vais tester ! Combien de sous-comptes as-tu ?'],
      ['Elodie.Budget', 'Cinq. Plus, ça devient difficile à suivre.'],
      ['Isabelle.M', 'Nous faisons pareil en couple, avec un compte commun pour les charges.'],
      ['Julie_Toulouse', 'Super méthode, merci pour le partage.'],
    ],
  },
  {
    c: 'budget', t: 'question', a: 'Lucie_Lille',
    title: 'Premier salaire : comment répartir 1 800 € net ?',
    body: "Je commence mon premier CDI à 1 800 € net. Loyer de 650 €. Comment répartir le reste entre dépenses et épargne ?",
    sol: 1,
    r: [
      ['JeuneEpargnant', "J'ai commencé avec 10 % d'épargne, puis j'ai augmenté à chaque hausse de salaire."],
      ['Elodie.Budget', "Une base simple : d'abord les charges fixes, puis un virement automatique d'épargne dès la paie (même 100 €), puis le reste pour vivre. Constituez d'abord votre épargne de précaution avant de penser à investir."],
      ['Lucie_Lille', "Merci, je commence avec 150 € par mois."],
    ],
  },
  {
    c: 'budget', t: 'question', a: 'Julie_Toulouse',
    title: 'Résilier ses abonnements : vos astuces pour ne rien oublier',
    body: "En faisant mes comptes, j'ai découvert trois abonnements que je n'utilisais plus. Comment faites-vous pour garder le contrôle ?",
    r: [
      ['Elodie.Budget', 'Une fois par trimestre, je relis tous mes prélèvements. Tout ce qui n’a pas servi est résilié.'],
      ['Marc_Lyon', "J'utilise une carte bancaire dédiée aux abonnements, c'est plus lisible."],
    ],
  },
  {
    c: 'budget', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : utilisez-vous une application pour gérer votre budget ?',
    body: 'Application, tableur, carnet ou rien du tout ?',
    poll: ['Application de ma banque', 'Application dédiée', 'Tableur', 'Rien'],
    r: [['Elodie.Budget', 'Tableur, toujours. J’aime tout maîtriser.']],
  },
  {
    c: 'budget', t: 'question', a: 'Agnes.Senior',
    title: 'Réduire ses frais bancaires : changer de banque à 70 ans ?',
    body: "Je paie près de 200 € de frais bancaires par an. Mes enfants me poussent à changer de banque. Est-ce compliqué à mon âge ?",
    sol: 0,
    r: [
      ['Isabelle.M', "Le service de mobilité bancaire s'occupe de transférer les prélèvements et virements à votre place. La nouvelle banque fait la majorité des démarches. Comparez aussi les banques traditionnelles moins chères si vous tenez à une agence."],
      ['Francoise63', 'Je l’ai fait à 68 ans, aucun regret !'],
    ],
  },
  // --------------------------------------------------------------- Café
  {
    c: 'cafe', t: 'discussion', a: 'Antoine_Bordeaux',
    title: 'Présentation : Antoine, 34 ans, ingénieur à Bordeaux',
    body: "Bonjour à tous ! Lecteur du Revenu depuis quelques années, je me lance dans la communauté. Je construis mon patrimoine avec un PEA et j'envisage un achat immobilier.",
    r: [
      ['Camille_B', 'Bienvenue Antoine !'],
      ['Moderation', 'Bienvenue ! Pensez à choisir vos espaces favoris pour personnaliser votre fil.'],
    ],
  },
  {
    c: 'cafe', t: 'discussion', a: 'Isabelle.M',
    title: 'Comment parlez-vous d’argent avec vos enfants ?',
    body: "Mes enfants commencent à demander de l'argent de poche. Je voudrais leur apprendre à gérer, sans que ce soit une source de conflit. Vos expériences ?",
    r: [
      ['Elodie.Budget', 'Argent de poche fixe, et une règle : un tiers dans la tirelire épargne.'],
      ['Francoise63', "Mes parents ne m'en parlaient jamais. Avec mes enfants, j'ai fait l'inverse, et ils gèrent bien aujourd'hui."],
      ['Nadia.Patrimoine', 'On joue aussi au Monopoly, ça lance de vraies discussions !'],
    ],
  },
  {
    c: 'cafe', t: 'discussion', a: 'PapyBoursier',
    title: 'Votre pire décision financière (et ce que vous en avez appris)',
    body: "Je commence : en 2000, j'ai tout mis sur des valeurs technologiques à la mode. Perte de 70 % en deux ans. J'ai appris la diversification à mes dépens.",
    r: [
      ['FredDividendes', 'Un crédit à la consommation pour une voiture que je ne pouvais pas me payer. Plus jamais.'],
      ['LeRentier', "Avoir laissé mon épargne dix ans sur un compte courant. L'inflation a fait le reste."],
      ['JeuneEpargnant', "Acheter une cryptomonnaie sur le conseil d'un influenceur. On ne m'y reprendra pas."],
      ['Sophie.Invest', 'Merci à tous, c’est le sujet le plus instructif du mois !'],
    ],
  },
  {
    c: 'cafe', t: 'discussion', a: 'Mehdi_Paris',
    title: 'Présentation : Mehdi, futur primo-accédant parisien',
    body: "Bonjour ! 29 ans, cadre à Paris, je prépare mon premier achat immobilier. Ravi de rejoindre la communauté, j'ai déjà appris beaucoup en vous lisant.",
    r: [
      ['Karim_Immo', "Bienvenue Mehdi, n'hésite pas à poser tes questions dans l'espace Immobilier."],
      ['Yann_Brest', 'Bienvenue et bon courage pour la recherche !'],
    ],
  },
  {
    c: 'cafe', t: 'poll', a: 'LaRedaction',
    title: 'Sondage : quel sujet voulez-vous voir dans le prochain Revenu ?',
    body: 'La rédaction vous écoute. Votez pour le dossier que vous aimeriez lire.',
    poll: ['Bien choisir son PER', 'Investir en Bourse en 2026', 'Préparer sa succession', 'Réduire ses impôts légalement'],
    r: [
      ['Gaelle_Rennes', 'Le PER, sans hésiter !'],
      ['Francoise63', 'La succession, pour la génération des grands-parents.'],
    ],
  },
  {
    c: 'cafe', t: 'discussion', a: 'Helene_R',
    title: 'Merci à la communauté : j’ai enfin ouvert mon assurance-vie',
    body: "Après des mois à lire vos discussions, j'ai ouvert mon premier contrat d'assurance-vie en ligne. Sans vous, je n'aurais pas osé. Merci !",
    r: [
      ['Odile.Retraite', 'Bravo Hélène ! Le plus dur, c’est de commencer.'],
      ['Camille_B', 'Félicitations ! 🎉'],
      ['LaRedaction', 'Merci pour ce message, ça fait plaisir à toute la rédaction.'],
    ],
  },
];

const POSTS: Array<{ a: string; c: string | null; title: string; body: string; comments: Array<[string, string]> }> = [
  {
    a: 'Elodie.Budget', c: 'budget', title: "Comment j'ai remboursé 12 000 € de crédits en deux ans",
    body: "Il y a trois ans, j'avais trois crédits à la consommation et un découvert permanent. Voici ce qui a marché pour moi.\n\n**1. Tout lister.** Montant restant, taux, mensualité. Voir les chiffres noir sur blanc fait un choc salutaire.\n\n**2. Rembourser le plus cher d'abord.** Chaque euro en plus allait sur le crédit au taux le plus élevé.\n\n**3. Supprimer le découvert.** Une enveloppe « tampon » de 300 € a suffi à casser le cercle.\n\nAujourd'hui, plus aucun crédit, et j'épargne chaque mois ce que je remboursais.",
    comments: [['Lucie_Lille', 'Très motivant, merci !'], ['Isabelle.M', "Rembourser le plus cher d'abord, c'est tellement logique et pourtant on ne le fait pas."]],
  },
  {
    a: 'Yann_Brest', c: 'immobilier', title: 'Dix ans de location meublée : mes chiffres réels',
    body: "Deux studios achetés en 2015, loués meublés à des étudiants. Après dix ans, voici mes vrais chiffres, charges, vacance locative et travaux compris.\n\nRentabilité brute affichée à l'achat : 7 %. Rentabilité nette réelle : un peu moins de 4 %. L'écart vient surtout des travaux et des mois sans locataire.\n\nEst-ce que je recommencerais ? Oui, mais en prévoyant une vraie réserve pour les travaux dès le départ.",
    comments: [['Karim_Immo', "L'écart brut / net est toujours sous-estimé. Merci pour la transparence."], ['Mehdi_Paris', 'Très instructif avant un premier achat.']],
  },
  {
    a: 'Odile.Retraite', c: 'retraite', title: "Préparer sa retraite en cinq ans : mon calendrier",
    body: "Cinq ans avant mon départ, j'ai établi un calendrier. Je le partage, il m'a évité beaucoup de stress.\n\n- **À 5 ans :** vérifier le relevé de carrière et corriger les oublis.\n- **À 3 ans :** simuler sa pension et tester son budget retraite.\n- **À 1 an :** choisir sa date de départ et revoir sa mutuelle.\n- **À 6 mois :** déposer la demande de retraite en ligne.",
    comments: [['Gaelle_Rennes', 'Je l’imprime et je l’affiche !'], ['Antoine_Bordeaux', 'Je suis loin de la retraite, mais je vais vérifier mon relevé dès maintenant.']],
  },
  {
    a: 'FredDividendes', c: 'bourse', title: "Pourquoi je ne vends jamais une action à cause d'une baisse",
    body: "Une baisse de 20 % n'est pas une raison de vendre. Une dégradation durable de l'entreprise, si.\n\nAvant chaque achat, j'écris en deux lignes pourquoi j'achète. Quand le cours baisse, je relis ces lignes : si les raisons tiennent toujours, je garde, voire je renforce.\n\nCe petit rituel m'a évité de nombreuses ventes paniquées.",
    comments: [['Thomas_PEA', 'Excellente idée, le journal d’achat.'], ['PapyBoursier', "Je pratique depuis longtemps, c'est redoutablement efficace."]],
  },
  {
    a: 'Francoise63', c: 'transmission', title: 'Ce que j’ai appris en organisant ma donation',
    body: "À 72 ans, j'ai décidé de transmettre une partie de mon patrimoine de mon vivant. Trois enseignements.\n\n**Parler avant de signer.** Réunir les enfants et expliquer nos choix a évité tout malentendu.\n\n**Se faire accompagner.** Le notaire nous a fait découvrir des options que nous ignorions.\n\n**Garder de quoi vivre.** Donner, oui, mais sans se mettre en difficulté.",
    comments: [['Me_Garnier', 'Trois conseils que je ne peux que confirmer.'], ['Nadia.Patrimoine', 'Merci Françoise, c’est exactement ce que je prépare.']],
  },
  {
    a: 'Hugo_Alternatif', c: 'alternatifs', title: "Placements alternatifs : ma règle des 10 %",
    body: "J'aime explorer les placements hors des sentiers battus : crowdfunding, or, forêts. Mais j'ai une règle stricte : jamais plus de 10 % de mon patrimoine.\n\nLe reste est investi simplement : épargne de précaution, assurance-vie, PEA. Les placements alternatifs, c'est le piment, pas le plat principal.",
    comments: [['Sophie.Invest', 'Le piment, pas le plat principal : je retiens la formule !']],
  },
  {
    a: 'Pierre_Expat', c: 'impots', title: "Expatrié : la check-list fiscale que j'aurais aimé avoir",
    body: "Partir vivre à l'étranger change beaucoup de choses fiscalement. Ma check-list :\n\n- Déclarer son départ et sa nouvelle adresse à l'administration fiscale.\n- Prévenir sa banque et ses assureurs.\n- Vérifier la convention fiscale entre la France et le pays d'accueil.\n- Continuer à déclarer ses revenus de source française, s'il y en a.\n- Déclarer ses comptes étrangers tant qu'on est résident français.",
    comments: [['Sandrine_CGP', "Très complet. J'ajouterais : vérifier le sort de son PEA, qui pose des questions spécifiques."]],
  },
  {
    a: 'Lucie_Lille', c: null, title: 'Mes six premiers mois dans la vie active : ce que j’ai appris',
    body: "Premier salaire, premier appartement, premières factures. Six mois plus tard, mon bilan.\n\nJ'ai mis en place un virement automatique de 150 € dès la paie, j'ai rempli une partie de mon Livret A, et j'ai appris à dire non à certaines dépenses.\n\nMerci à la communauté pour tous vos conseils, en particulier sur le budget.",
    comments: [['Elodie.Budget', 'Bravo Lucie, tu as pris de bonnes habitudes très tôt !'], ['JeuneEpargnant', 'Très inspirant, même situation ici.']],
  },
];

/** Deterministic pseudo-random number in [0, 1) from an integer seed. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const between = (seed: number, min: number, max: number) => Math.round(min + rand(seed) * (max - min));

const DAY = 24 * 60;

export const EXTRA_USERS = USERS.map(([username, name, color, bio, interests], i) => ({
  username,
  name,
  color,
  role: 'member',
  subscriber: i % 3 === 0,
  pro: null,
  bio,
  points: between(i + 1, 15, 260),
  month: between(i + 101, 5, 60),
  streak: between(i + 201, 0, 9),
  interests: [...interests],
}));

/** Spread over the last ~75 days, newest first, so every tab and page has content. */
export const EXTRA_TOPICS = DRAFTS.map((d, i) => {
  const minutesAgo = Math.round(90 + i * 1.25 * DAY * (0.6 + rand(i + 300)));
  const step = Math.max(20, Math.floor(minutesAgo / (d.r.length + 2)));
  return {
    key: 1000 + i,
    category: d.c,
    type: d.t,
    author: d.a,
    minutesAgo,
    pinned: false,
    // The home widgets keep featuring the prototype's question and poll.
    featured: 'none',
    useful: between(i + 400, 0, 45),
    views: between(i + 500, 40, 2400),
    title: d.title,
    content: d.body,
    article: null,
    pollOptions: d.poll ? d.poll.map((label, k) => ({ label, votes: between(i * 10 + k + 600, 12, 320) })) : null,
    solution: d.sol ?? null,
    replies: d.r.map(([author, content], k) => ({
      author,
      content,
      useful: between(i * 10 + k + 700, 0, 30),
      minutesAgo: Math.max(5, minutesAgo - step * (k + 1)),
      verified: d.ver === k,
    })),
  };
});

export const EXTRA_POSTS = POSTS.map((p, i) => {
  const minutesAgo = Math.round(DAY * (1 + i * 6 + rand(i + 800) * 4));
  return {
    author: p.a,
    category: p.c,
    minutesAgo,
    useful: between(i + 900, 4, 60),
    views: between(i + 950, 120, 1800),
    title: p.title,
    content: p.body,
    comments: p.comments.map(([author, content], k) => ({
      author,
      content,
      useful: between(i * 10 + k + 1000, 0, 15),
      minutesAgo: Math.max(10, minutesAgo - (k + 1) * 180),
    })),
  };
});
