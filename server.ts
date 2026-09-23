import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY non rilevata in ambiente. Verrà impiegato il motore sapienziale islamico integrato.");
      return null;
    }
    try {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.error("Errore inizializzazione client Gemini:", e);
      return null;
    }
  }
  return aiClient;
}

// Modelli candidati supportati e attuali in ordine di resilienza e priorità
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-lite-latest'
];

async function generateWithFallback(
  params: {
    contents: any;
    config?: any;
  }
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("CLIENT_UNAVAILABLE");
  }

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    // Fino a 2 tentativi per modello per gestire spike temporanei (es. 503)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 20000)
        );
        const generatePromise = ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config
        });
        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err || '');
        const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('429') || msg.includes('overloaded');
        
        if (isTransient && attempt === 0) {
          // Breve attesa prima di riprovare o passare al modello successivo
          await new Promise(resolve => setTimeout(resolve, 600));
          continue;
        }
        break; // Passa al modello alternativo
      }
    }
  }

  throw lastError || new Error("ALL_MODELS_FAILED");
}

// Motore di sapienza islamica integrato (Offline/Quota Fallback)
function getOfflineChatReply(message: string, isDialogue?: boolean): string {
  const isArabic = /[\u0600-\u06FF]/.test(message);
  const q = message.toLowerCase();

  if (isArabic) {
    if (q.includes('وضوء') || q.includes('الوضوء') || q.includes('طهارة')) {
      return `**صفة الوضوء الصحيحة خطوة بخطوة:**\n\n1. **النية** في القلب والتسمية (بسم الله).\n2. **غسل اليدين** إلى الرسغين ثلاث مرات.\n3. **المضمضة والاستنشاق** ثلاث مرات.\n4. **غسل الوجه** كاملاً ثلاث مرات من منبت الشعر إلى الذقن.\n5. **غسل اليدين إلى المرفقين** ثلاث مرات، نبدأ باليمنى ثم اليسرى.\n6. **مسح الرأس** مرة واحدة مع مسح الأذنين.\n7. **غسل الرجلين إلى الكعبين** ثلاث مرات.\n\nهل ترغب في أن نتحدث أكثر عن سنن الوضوء ومبطلاته؟`;
    }
    if (q.includes('صلاة') || q.includes('فجر') || q.includes('عصر') || q.includes('ظهر') || q.includes('مغرب') || q.includes('عشاء') || q.includes('قضاء')) {
      return `**الصلاة ركن الإسلام وعماد الدين:**\n\nقال رسول الله ﷺ: «أحب الأعمال إلى الله الصلاة على وقتها». وإذا فاتتك صلاة بنوم أو نسيان، فكفارتها أن تصليها فور تذكرها.\n\nتفضل بسؤالي عن أي جانب من الصلاة، وسأكون سعيداً جداً بمواصلة الحوار معك!`;
    }
    if (q.includes('دعاء') || q.includes('إفطار') || q.includes('صيام') || q.includes('رمضان')) {
      return `**دعاء الإفطار المأثور:**\n\n«ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ»\n\nالصيام عبادة عظيمة ترفع الدرجات وتقرب العبد من ربه. ما الذي تحب أن نتناقش فيه أكثر؟`;
    }
    return `وعليكم السلام ورحمة الله وبركاته 🌿\n\nأهلاً وسهلاً بك يا أخي العزيز. بخصوص: "${message}"\n\nأنا هنا معك كصديق ومساعد ذكي في أي وقت، يمكنك أن تسألني وتتحاور معي في كل ما يتعلق بالدين الإسلامي، الفقه، القرآن، أو أي موضوع آخر في الحياة العامة والثقافة. تفضل بالحديث وأنا أستمع إليك!`;
  }

  if (q.includes('wudu') || q.includes('abluzion') || q.includes('lavar') || q.includes('وضوء') || q.includes('udù') || q.includes('udu') || q.includes('wudhu') || q.includes('ghusl') || q.includes('purificaz')) {
    return `**L'Abluzione (Al-Wudu' - الوضوء) passo dopo passo secondo la Sunnah:**

1. **Intenzione sincera (Niyyah):** Nel cuore, pronunciando *Bismillah* (Nel nome di Allah).
2. **Lavare le mani:** Tre volte fino ai polsi, facendo passare l'acqua tra le dita.
3. **Sciacquare la bocca (Madmadah):** Tre volte con la mano destra.
4. **Sciacquare il naso (Istinshaq):** Inspirare delicatamente un po' d'acqua con la destra ed espellerla con la sinistra (tre volte).
5. **Lavare il viso:** Tre volte, dall'attaccatura dei capelli al mento e da un orecchio all'altro.
6. **Lavare le braccia:** Tre volte dalle dita fino al gomito incluso, iniziando dal braccio destro poi il sinistro.
7. **Passare le mani bagnate sui capelli (Mash):** Una volta, dalla fronte alla nuca e ritorno.
8. **Pulire le orecchie:** Una volta con gli indici dentro e i pollici dietro i padiglioni.
9. **Lavare i piedi:** Tre volte fino alle caviglie incluse, iniziando dal destro e passando tra le dita.

✨ **Dua dopo il Wudu:**
*«Ash-hadu alla ilaha illallah, wahdahu la sharika lah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh. Allahumma ij'alni minat-tawwabin waj'alni minal-mutatahhirin.»*
*(Chi lo recita vedrà aperte le otto porte del Paradiso - Hadith Tirmidhi).*`;
  }

  if (q.includes('iftar') || q.includes('digiun') || q.includes('ramadan') || q.includes('sawm') || q.includes('إفطار')) {
    return `**Supplica autentica (Dua) per la rottura del digiuno (Iftar):**

📜 **In arabo:**
« ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ »

🔊 **Traslitterazione:**
*Dhahaba az-zama'u, wabtallati al-'uruq, wa thabata al-ajru in sha'Allah.*

🇮🇹 **Traduzione:**
*"È svanita la sete, si sono inumidite le vene ed è confermata la ricompensa, se Allah vuole."* (Sunan Abi Dawud, Sahih).

🌿 **Sunnah all'Iftar:**
Rompere il digiuno con datteri freschi o maturi (*Rutab* o *Tamr* in numero dispari), oppure con qualche sorso d'acqua prima di eseguire la preghiera del Maghrib.`;
  }

  if (q.includes('recuper') || q.includes('persa') || q.includes('dimenticat') || q.includes('qada') || q.includes('salat') || q.includes('preghier')) {
    return `**Come recuperare una preghiera obbligatoria (Salat Al-Qada'):**

Il Nobile Profeta ﷺ ha detto:
*«Chi dimentica una preghiera o vi si addormenta, la sua espiazione è compierla non appena se ne ricorda, non vi è altra espiazione per essa.»* (Sahih Al-Bukhari e Muslim).

📌 **Regole pratiche:**
1. Non appena ti ricordi o ti svegli, fai il Wudu e prega immediatamente la preghiera tralasciata.
2. Rispetta l'ordine delle preghiere se possibile (es. recupera il Dhuhr prima dell'Asr).
3. La preghiera va eseguita nella sua forma abituale (stesso numero di Raka'at).
4. Se hai saltato più preghiere per dimenticanza o sonno, recupérale in sequenza ordinata senza rimandare.`;
  }

  if (q.includes('genitor') || q.includes('madre') || q.includes('padre') || q.includes('mamma') || q.includes('papà') || q.includes('والدين')) {
    return `**Il Dovere verso i Genitori nell'Islam (Birr Al-Walidayn):**

Nel Sacro Corano, Allah l'Altissimo ha associato il Suo culto monoteistico al rispetto devoto dei genitori:
*«Il tuo Signore ha decretato di non adorare altri che Lui e di trattare i genitori con benevolenza. Se uno di essi o entrambi raggiungono la vecchiaia presso di te, non dire loro neppure "Uff!" e non rimproverarli, ma rivolgiti a loro con parole nobili.»* (Sura Al-Isra', 17:23).

Il Profeta ﷺ disse, alla domanda su chi meritasse più compagnia e benevolenza:
*«Tua madre, poi tua madre, poi tua madre, poi tuo padre.»* (Bukhari e Muslim).

💡 **Consigli pratici:**
- Ascoltali con pazienza e rispetto senza mai alzare la voce.
- Dedica loro tempo quotidiano e fai suppliche per loro (*Rabbi irhamhuma kama rabbayani saghira*).`;
  }

  if (q.includes('tahajjud') || q.includes('notturn') || q.includes('notte') || q.includes('qiyam')) {
    return `**La Preghiera Notturna (Tahajjud - قيام الليل):**

Il Tahajjud è una delle forme più elevate di adorazione volontaria (*Sunnah Mu'akkadah*).

⏰ **Momento migliore:**
L'ultimo terzo della notte prima del Fajr, momento in cui Allah scende al cielo più vicino ed esaudisce le invocazioni.

🤲 **Come eseguirlo:**
1. Fai il Wudu e formula l'intenzione nel cuore.
2. Prega a coppie di due Raka'at (es. 2, 4, 6 o 8 Raka'at).
3. Concludi con la preghiera del Witr (1 o 3 Raka'at).
4. Approfitta del sujud (prosternazione) per supplicare Allah con sincerità.`;
  }

  return `**Risposta dell'Assistente Islamico di Bastia Umbra:**

Assalamu Alaykum wa Rahmatullahi wa Barakatuh. 🌿

Riguardo alla tua domanda: **"${message}"**

Nel Sacro Corano e nella Sunnah del Profeta Muhammad ﷺ, la regola aurea per ogni fedele è cercare la sincerità (*Ikhlas*), mantenere la regolarità nella preghiera e agire con giustizia e gentilezza (*Ihsan*) verso il prossimo.

💡 **Consigli per la pratica quotidiana:**
1. Ricorda spesso Allah con il Dhikr (SubhanAllah, Alhamdulillah, Allahu Akbar).
2. Conserva l'orario della preghiera prescritta a Bastia Umbra.
3. Se desideri un approfondimento dottrinale dettagliato su quesiti specifici o fatwa, ti invitiamo con affetto a rivolgerti direttamente all'Imam presso la moschea dell'Associazione Culturale Islamica Arrahma (A.C.I.A) di Bastia Umbra.`;
}

function getOfflineTafsir(text: string): string {
  const t = text.toLowerCase();

  if (t.includes('عسر') || t.includes('يسر') || t.includes('difficoltà') || t.includes('facilità') || t.includes('sharh')) {
    return `1. 📖 **Significato generale:**
Questo sublime versetto della Sura Ash-Sharh (94:6) ribadisce una legge divina immutabile: ogni difficoltà (*'Usr*) è sempre accompagnata da un sollievo (*Yusr*). In arabo la parola 'facilità' è indefinita e rinnovata, a significare che con una sola prova giungono molteplici forme di sollievo, conforto e benedizione da parte di Allah.

2. 💡 **Insegnamento pratico:**
Quando affronti momenti faticosi nel lavoro, nella salute o negli affari di famiglia, mantieni saldo l'ottimismo e la fiducia in Allah. Non disperare, continua a fare la tua parte con onestà sapendo che l'apertura spirituale e materiale è vicina.`;
  }

  if (t.includes('فاذكروني') || t.includes('ricordatevi') || t.includes('baqarah') || t.includes('152')) {
    return `1. 📖 **Significato generale:**
Allah l'Onnipotente afferma: «Ricordatevi di Me e Io Mi ricorderò di voi» (2:152). È uno dei patti d'amore più toccanti del Corano: il Signore dei Mondi menziona il servo tra gli angeli quando il servo Lo ricorda sulla Terra con parole e devozione sincera.

2. 💡 **Insegnamento pratico:**
Mantieni la lingua umida con il ricordo di Allah durante la giornata, sui mezzi, al lavoro o a riposo. Sii riconoscente ringraziando con un sincero *Alhamdulillah* anche per le benedizioni quotidiane invisibili.`;
  }

  if (t.includes('سألك عبادي') || t.includes('قريب') || t.includes('vicino') || t.includes('186')) {
    return `1. 📖 **Significato generale:**
Allah rivela: «E quando i Miei servi ti chiedono di Me, ebbene Io sono vicino: rispondo alla supplica di chi invoca» (2:186). Non vi è alcun intermediario tra il credente e il suo Creatore; Egli ascolta ogni sospiro, ogni segreto del cuore e ogni lacrima sincera.

2. 💡 **Insegnamento pratico:**
Non esitare ad aprire il cuore ad Allah in ogni istante, specialmente nei momenti di prosternazione (Sujud) o prima dell'alba. Chiedi non solo i beni materiali, ma la serenità interiore, la guida retta e il perdono.`;
  }

  if (t.includes('ألا بذكر') || t.includes('cuori') || t.includes('ra\'d') || t.includes('28')) {
    return `1. 📖 **Significato generale:**
«Non è forse con il ricordo di Allah che si acquietano i cuori?» (Sura Ar-Ra'd 13:28). Il cuore umano trova autentica pace e riposo solo quando si riconnette con la sua sorgente divina, liberandosi dall'ansia per il futuro e dai rimpianti del passato.

2. 💡 **Insegnamento pratico:**
Nei momenti di tensione, stress o incertezza, fermati per 2 minuti, respira e ripeti con concentrazione: *Astaghfirullah*, *SubhanAllah wa bihamdihi*. Sentirai la calma discendere nell'anima.`;
  }

  return `1. 📖 **Significato generale:**
Questo nobile testo richiama l'unità di Allah (Tawhid), la certezza nella Sua infinita provvidenza e il valore fondamentale della pazienza e della retta intenzione. Ogni parola coranica e profetica è stata rivelata come luce e guida per purificare il cuore del credente.

2. 💡 **Insegnamento pratico:**
Rifletti su come trasformare queste parole in azioni: sii fonte di pace nella tua famiglia, mantieni la promessa data e affronta ogni dovere quotidiano come un atto di adorazione e bontà verso la comunità.`;
}

function getOfflineQuranSearch(topic: string): string {
  const top = topic.toLowerCase();

  if (top.includes('pazienz') || top.includes('sabr') || top.includes('صبر')) {
    return `📌 **Sura Al-Baqarah (2:153)**
📜 يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ
🇮🇹 *"O voi che credete! Cercate aiuto nella pazienza e nella preghiera; in verità Allah è con coloro che sono pazienti."*
✨ *Riflessione:* La pazienza attiva unita alla preghiera è l'ancora incrollabile di fronte a qualsiasi difficoltà della vita.

📌 **Sura Az-Zumar (39:10)**
📜 إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ
🇮🇹 *"In verità ai pazienti sarà data la loro ricompensa senza misura."*
✨ *Riflessione:* La ricompensa della pazienza supera ogni calcolo umano, è un dono illimitato della misericordia di Allah.`;
  }

  if (top.includes('perdon') || top.includes('misericord') || top.includes('maghfira') || top.includes('rahma')) {
    return `📌 **Sura Az-Zumar (39:53)**
📜 قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا
🇮🇹 *"Di': O Miei servi che avete ecceduto contro voi stessi, non disperate della misericordia di Allah! In verità Allah perdona tutti i peccati."*
✨ *Riflessione:* È il versetto della speranza suprema: le porte della misericordia divina non sono mai chiuse per chi si pente con cuore sincero.

📌 **Sura Al-A'raf (7:156)**
📜 وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ
🇮🇹 *"E la Mia misericordia abbraccia ogni cosa."*
✨ *Riflessione:* Nessun dolore o errore è più grande della misericordia con cui il Creatore protegge e accoglie le Sue creature.`;
  }

  if (top.includes('pace') || top.includes('cuor') || top.includes('dhikr') || top.includes('tranquill')) {
    return `📌 **Sura Ar-Ra'd (13:28)**
📜 الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
🇮🇹 *"Coloro che credono e i cui cuori si acquietano nel ricordo di Allah. Non è forse con il ricordo di Allah che si acquietano i cuori?"*
✨ *Riflessione:* La vera serenità interiore non dipende dalle circostanze esteriori, ma dalla presenza costante di Allah nell'anima.`;
  }

  return `📌 **Sura Al-Baqarah (2:186)**
📜 وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ
🇮🇹 *"E quando i Miei servi ti chiedono di Me,bbene Io sono vicino: rispondo alla preghiera di chi Mi invoca quando Mi invoca."*
✨ *Riflessione:* Un invito continuo a dialogare con il Creatore in ogni momento di bisogno o gratitudine.

📌 **Sura Ash-Sharh (94:5-6)**
📜 فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۞ إِنَّ مَعَ الْعُسْرِ يُسْرًا
🇮🇹 *"In verità, con la difficoltà c'è la facilità. Sì, con la difficoltà c'è la facilità."*
✨ *Riflessione:* La promessa divina che ogni prova porta in sé il seme del sollievo e della luce.`;
}

function getOfflineDailyReflection(): string {
  const reflections = [
    `🌙 **Tadabbur del Giorno per Bastia Umbra:**
*«In verità, con la difficoltà c'è la facilità»* (Corano 94:6).

Oggi, affronta le incombenze quotidiane con un respiro di sollievo e fiducia. Qualunque sia il peso sul tuo animo, ricorda che Allah non ti lascia mai solo. Semina parole buone con chi incontri in famiglia o al lavoro, perché un sorriso sincero è carità (*Sadaqah*). Che Allah benedica questa tua giornata di pace.`,

    `🌙 **Tadabbur del Giorno per Bastia Umbra:**
*«Ricordatevi di Me e Io Mi ricorderò di voi; siatemi riconoscenti»* (Corano 2:152).

La vera forza del credente nasce nella gratitudine per le piccole grazie invisibili: la salute, il respiro, un pasto condiviso. Oggi dedica qualche istante al silenzio e al ricordo di Allah (Dhikr): il tuo cuore ritroverà serenità e chiarezza.`,

    `🌙 **Tadabbur del Giorno per Bastia Umbra:**
*Il Nobile Profeta ﷺ disse: «Il migliore tra voi è colui che ha il miglior carattere.»* (Bukhari).

Oggi fai del buon carattere (*Husn al-Khuluq*) la tua bandiera: sii paziente quando qualcuno ha fretta, rispondi al risentimento con la mitezza e compi una buona azione silenziosa. La vicinanza di Allah si manifesta nella gentilezza verso le Sue creature.`
  ];

  const dayIndex = new Date().getDate() % reflections.length;
  return reflections[dayIndex];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. API: Assistente Islamico Intelligente (Chat & Dialogo)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history, mode } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Il campo messaggio è obbligatorio.' });
      }

      const isDialogue = mode === 'dialogue';

      const systemInstruction = `Sei un assistente virtuale intelligente basato su modello avanzato Gemini, integrato nell'app Muslim Pro Bastia (Associazione Culturale Islamica Arrahma A.C.I.A).
Comprendi e parli fluentemente QUALSIASI lingua del mondo, con maestria speciale in Arabo (العربية الفصحى، اللهجة المغربية الدارجة وباقي اللهجات العربية), Italiano, Francese e Inglese.

CAPACITÀ APERTA E SENZA LIMITI (COME GEMINI):
- Rispondi a QUALSIASI domanda ti venga posta dall'utente con intelligenza, precisione, rispetto ed equilibrio: questioni religiose islamiche (Corano, Hadith, Sunnah, Fiqh, preghiera, digiuno, dua, etica), ma anche riflessioni personali, dialogo aperto, cultura, scienza, consigli pratici di vita quotidiana e curiosità.
- Non porti limiti artificiosi e non rifiutare domande generiche o non religiose: rispondi sempre con garbo, saggezza ed empatia.

LINGUA E MULTILINGUISMO:
- Rispondi SEMPRE nella lingua in cui l'utente ti scrive o parla.
- Se l'utente scrive o parla in arabo (الفصحى أو الدارجة), rispondi in arabo naturale, corretto, accogliente e caloroso.
- Se l'utente usa l'italiano, rispondi in ottimo italiano chiaro e amichevole.
- Se l'utente usa il francese o l'inglese, rispondi in quella lingua.

${isDialogue ? `MODALITÀ DIALOGO E CONVERSAZIONE INTERATTIVA:
- L'utente vuole conversare e dialogare direttamente con te.
- Non limitarti a una risposta statica e unidirezionale: mantieni uno stile dialogante, piacevole e interattivo.
- Dopo aver risposto in modo chiaro ed empatico, aggiungi una domanda di rimando gentile o invita l'utente a proseguire il discorso (es. "Cosa ne pensi?", "Ti fa piacere che approfondiamo questo punto?", "هل تحب أن نتوسع في هذا الجانب أكثر يا أخي؟").
- Nelle risposte vocali, mantieni il testo fluido, piacevole da ascoltare a voce senza simboli o parentesi ridondanti.` : `MODALITÀ RISPOSTA DIRETTA:
- Fornisci risposte esaurienti, chiare e ben strutturate.`}

TONO:
- Caloroso, fraterno, saggio, rispettoso ed empatico.`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      if (Array.isArray(history)) {
        for (const item of history.slice(-10)) {
          if (item && item.text) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: String(item.text) }]
            });
          }
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      try {
        const replyText = await generateWithFallback({
          contents,
          config: {
            systemInstruction,
            temperature: isDialogue ? 0.7 : 0.5,
            maxOutputTokens: 1000
          }
        });
        return res.json({ reply: replyText });
      } catch {
        const fallbackReply = getOfflineChatReply(message, isDialogue);
        return res.json({ reply: fallbackReply });
      }
    } catch {
      return res.json({
        reply: getOfflineChatReply(req.body?.message || '', req.body?.mode === 'dialogue')
      });
    }
  });

  // 2. API: Tafsir & Spiegazione Ayah o Hadith
  app.post('/api/ai/tafsir', async (req, res) => {
    try {
      const { text, type, info } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Testo da spiegare mancante.' });
      }

      const prompt = `Fornisci una spiegazione spirituale breve, chiara ed accessibile (Tafsir / Sharh) per questo ${type === 'hadith' ? 'Hadith del Profeta ﷺ' : 'Versetto del Sacro Corano'}:
"${text}"
${info ? `Riferimento: ${info}` : ''}

Struttura la risposta in questo modo:
1. 📖 **Significato generale:** spiegazione del senso in parole semplici (massimo 2-3 frasi).
2. 💡 **Insegnamento pratico:** come un credente può applicare questo insegnamento nella propria vita quotidiana oggi a scuola, a lavoro o in famiglia.
Mantieni un tono elevato, sereno e costruttivo. Massimo 180 parole.`;

      try {
        const tafsirText = await generateWithFallback({
          contents: prompt,
          config: {
            systemInstruction: 'Sei una guida sapiente ed empatica che spiega il Corano e la Sunnah in modo limpido ed edificante.',
            temperature: 0.5,
            maxOutputTokens: 600
          }
        });
        return res.json({ tafsir: tafsirText });
      } catch {
        const fallbackTafsir = getOfflineTafsir(text);
        return res.json({ tafsir: fallbackTafsir });
      }
    } catch {
      return res.json({ tafsir: getOfflineTafsir(req.body?.text || '') });
    }
  });

  // 3. API: Ricerca Tematica Intelligente nel Corano
  app.post('/api/ai/search-quran', async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ error: 'Argomento mancante.' });
      }

      const prompt = `L'utente musulmano cerca versetti del Nobile Corano o Dua sull'argomento: "${topic}".
Trova 2 o 3 dei versetti o Dua più belli, autentici e pertinenti su questo tema.
Per ciascuno mostra:
- 📌 Sura e numero versetto
- 📜 Testo in arabo con vocali
- 🇮🇹 Traduzione italiana chiara
- ✨ Una breve riflessione di 1 riga sul perché è speciale per chi cerca pace in questo argomento.`;

      try {
        const resultsText = await generateWithFallback({
          contents: prompt,
          config: {
            systemInstruction: 'Sei un archivio sapiente del Sacro Corano e della Sunnah autentica.',
            temperature: 0.4,
            maxOutputTokens: 800
          }
        });
        return res.json({ results: resultsText });
      } catch {
        const fallbackResults = getOfflineQuranSearch(topic);
        return res.json({ results: fallbackResults });
      }
    } catch {
      return res.json({ results: getOfflineQuranSearch(req.body?.topic || '') });
    }
  });

  // 4. API: Riflessione Spirituale Quotidiana (Tadabbur)
  app.get('/api/ai/daily-reflection', async (_req, res) => {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      const prompt = `Genera una breve e toccante riflessione spirituale islamica (Tadabbur del giorno) per oggi ${dateStr}, rivolta alla comunità di Bastia Umbra.
Scegli un tema nobile (la gratitudine, la pazienza, la gentilezza, la misericordia di Allah, la preghiera sincera, la purezza dell'intenzione).
Includi:
- 1 breve versetto o detto profetico con traduzione
- 1 pensiero per affrontare con serenità la giornata odierna.
Massimo 130 parole.`;

      try {
        const reflectionText = await generateWithFallback({
          contents: prompt,
          config: {
            systemInstruction: 'Sei una voce spirituale accogliente che dona serenità e forza interiore.',
            temperature: 0.7,
            maxOutputTokens: 500
          }
        });
        return res.json({ reflection: reflectionText });
      } catch {
        const fallbackReflection = getOfflineDailyReflection();
        return res.json({ reflection: fallbackReflection });
      }
    } catch {
      return res.json({ reflection: getOfflineDailyReflection() });
    }
  });

  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Muslim Pro Server attivo su http://0.0.0.0:${PORT}`);
  });
}

startServer();
