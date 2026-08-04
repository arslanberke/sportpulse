// KVKK m.10 aydinlatma metni.
//
// Neden i18n sozlugunde degil: sozluk arayuz etiketleri icin: kisa, tek satir
// ve sik degisen kayitlar. Aydinlatma metni ise bolumlu, paragraf uzunlugunda
// ve birlikte guncellenmesi gereken bir butun. Ayri tutmak hem sozlugu okunur
// birakiyor hem metnin tamamini tek yerde gorunur kiliyor.
//
// Icerigi Kanun'un 10'uncu maddesi ve "Aydinlatma Yukumlulugunun Yerine
// Getirilmesinde Uyulacak Usul ve Esaslar Hakkinda Teblig" asgari basliklarini
// izler: veri sorumlusunun kimligi, islenen veriler, amaclar, hukuki sebep,
// aktarim (yurt disi dahil), saklama ve m.11 haklari.

import type { Language } from '@/lib/i18n';

export interface LegalSection {
  heading: string;
  body: string;
}

interface PrivacyNotice {
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const CONTACT = 'arslanberke95@gmail.com';
const CONTROLLER = 'Berke Arslan';

const tr: PrivacyNotice = {
  updated: 'Son güncelleme: 4 Ağustos 2026',
  intro:
    'Bu metin, sportpulse uygulamasını kullandığında hangi kişisel verilerinin işlendiğini, ' +
    'hangi amaçla ve hangi hukuki sebebe dayanılarak işlendiğini, kimlere aktarıldığını ve ' +
    'bu konudaki haklarını 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca açıklar.',
  sections: [
    {
      heading: 'Veri sorumlusu',
      body: `Veri sorumlusu ${CONTROLLER}'dır. Her türlü başvuru ve talebini ${CONTACT} adresine iletebilirsin.`,
    },
    {
      heading: 'İşlenen kişisel veriler',
      body:
        'Kimlik ve iletişim verisi: e-posta adresin, adın.\n' +
        'Hesap verisi: şifren (yalnızca şifrelenmiş özet olarak saklanır, tarafımızca görülemez), ' +
        'hesap oluşturma tarihin, seçtiğin ülke.\n' +
        'Kullanım verisi: takip ettiğin branş, lig ve takımlar; hatırlatma tercihlerin ' +
        '(kaç dakika önce bildirim, sessiz saat aralığı); sana gönderilen bildirim kayıtları.\n' +
        'Cihaz verisi: bildirim gönderebilmek için cihazının bildirim kimliği (push token) ve ' +
        'platform bilgisi.',
    },
    {
      heading: 'İşleme amaçları',
      body:
        'Hesabının oluşturulması ve girişinin sağlanması; takip ettiğin yarışmalara göre sana ' +
        'özel fikstür, sonuç ve yayın bilgisinin gösterilmesi; seçtiğin zamanlarda maç ' +
        'hatırlatması ve sonuç bildirimi gönderilmesi; uygulamanın güvenliğinin ve ' +
        'sürdürülebilirliğinin sağlanması.',
    },
    {
      heading: 'Hukuki sebep',
      body:
        'Verilerin, KVKK m.5/2-(c) uyarınca "bir sözleşmenin kurulması veya ifasıyla doğrudan ' +
        'doğruya ilgili olması" hukuki sebebine dayanılarak işlenir: hesap ve bildirim ' +
        'tercihleri olmadan hizmet sunulamaz. Veriler tamamen otomatik yollarla, uygulamayı ' +
        'kullanman sırasında elde edilir.',
    },
    {
      heading: 'Aktarım ve yurt dışına aktarım',
      body:
        'Veritabanı ve kimlik doğrulama altyapısı Supabase tarafından sağlanır ve veriler ' +
        'Almanya (Frankfurt) bölgesindeki sunucularda barındırılır.\n' +
        'Bildirim gönderimi için cihaz bildirim kimliğin Expo ve Apple bildirim servislerine ' +
        'aktarılır; bu aktarım yalnızca bildirimin cihazına ulaşması amacıyla yapılır.\n' +
        'Bu aktarımlar KVKK m.9 kapsamında yurt dışına aktarım niteliğindedir ve hizmetin ' +
        'ifası için zorunludur.\n' +
        'Maç özetlerinin hazırlanmasında yapay zeka servisi kullanılır; bu servise yalnızca ' +
        'maça ilişkin bilgiler gönderilir, kişisel verilerin aktarılmaz.\n' +
        'Verilerin reklam veya pazarlama amacıyla üçüncü kişilere satılmaz, devredilmez.',
    },
    {
      heading: 'Saklama süresi',
      body:
        'Veriler hesabın açık kaldığı sürece saklanır. Hesabını uygulama içinden ' +
        'Ayarlar > Hesabı sil ile sildiğinde; profilin, takiplerin, hatırlatma tercihlerin, ' +
        'bildirim kayıtların ve cihaz bildirim kimliğin birlikte kalıcı olarak silinir.',
    },
    {
      heading: 'Haklarınız',
      body:
        'KVKK m.11 uyarınca; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse ' +
        'buna ilişkin bilgi talep etme, işleme amacını ve amaca uygun kullanılıp kullanılmadığını ' +
        'öğrenme, yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme, ' +
        'eksik veya yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini ' +
        'isteme, bu işlemlerin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme, ' +
        'işlenen verilerin münhasıran otomatik sistemler yoluyla analiz edilmesi sonucu aleyhine ' +
        'bir sonuç ortaya çıkmasına itiraz etme ve kanuna aykırı işleme sebebiyle zarara ' +
        `uğraman hâlinde zararın giderilmesini talep etme haklarına sahipsin. Taleplerini ${CONTACT} ` +
        'adresine iletebilirsin.',
    },
    {
      heading: 'Değişiklikler',
      body:
        'Bu metin, veri işleme süreçleri değiştiğinde güncellenir. Kişisel verilerinin ' +
        'işlenmesini etkileyen değişiklikler uygulama üzerinden duyurulur.',
    },
  ],
};

const en: PrivacyNotice = {
  updated: 'Last updated: 4 August 2026',
  intro:
    'This notice explains which personal data sportpulse processes when you use the app, for ' +
    'which purposes and on which legal basis, who it is shared with, and the rights you have, ' +
    'in line with Turkish Personal Data Protection Law No. 6698 (KVKK).',
  sections: [
    {
      heading: 'Data controller',
      body: `The data controller is ${CONTROLLER}. You can send any request to ${CONTACT}.`,
    },
    {
      heading: 'Personal data processed',
      body:
        'Identity and contact: your email address and name.\n' +
        'Account: your password (stored only as a cryptographic hash and never visible to us), ' +
        'the date you signed up, and the country you pick.\n' +
        'Usage: the sports, leagues and teams you follow; your reminder preferences (how long ' +
        'before an event, quiet hours); records of notifications sent to you.\n' +
        'Device: your device push token and platform, so notifications can be delivered.',
    },
    {
      heading: 'Purposes',
      body:
        'Creating your account and signing you in; showing fixtures, results and broadcast ' +
        'information for the competitions you follow; sending the reminders and result alerts ' +
        'you have chosen; keeping the service secure and sustainable.',
    },
    {
      heading: 'Legal basis',
      body:
        'Processing relies on Article 5/2-(c) of KVKK: it is directly related to the conclusion ' +
        'or performance of a contract. The service cannot be provided without an account and ' +
        'notification preferences. Data is collected by automated means as you use the app.',
    },
    {
      heading: 'Transfers, including abroad',
      body:
        'The database and authentication are provided by Supabase and hosted in the Germany ' +
        '(Frankfurt) region.\n' +
        'To deliver notifications, your device push token is shared with the Expo and Apple ' +
        'notification services, solely so the notification reaches your device.\n' +
        'These constitute transfers abroad under Article 9 of KVKK and are necessary to provide ' +
        'the service.\n' +
        'An AI service is used to prepare match briefings; only match information is sent to it, ' +
        'never your personal data.\n' +
        'Your data is never sold or transferred to third parties for advertising or marketing.',
    },
    {
      heading: 'Retention',
      body:
        'Data is kept for as long as your account exists. When you delete your account from ' +
        'Settings > Delete account, your profile, follows, reminder preferences, notification ' +
        'records and device push token are permanently deleted with it.',
    },
    {
      heading: 'Your rights',
      body:
        'Under Article 11 of KVKK you may: learn whether your personal data is processed and ' +
        'request information about it; learn the purpose of processing and whether the data is ' +
        'used accordingly; know the third parties to whom it is transferred at home or abroad; ' +
        'request correction of incomplete or inaccurate data; request erasure or destruction; ' +
        'request that such actions be notified to third parties the data was transferred to; ' +
        'object to adverse outcomes arising solely from automated analysis; and claim compensation ' +
        `for damages caused by unlawful processing. Send requests to ${CONTACT}.`,
    },
    {
      heading: 'Changes',
      body:
        'This notice is updated when data processing practices change. Changes that affect the ' +
        'processing of your personal data are announced in the app.',
    },
  ],
};

export function privacyNoticeFor(language: Language): PrivacyNotice {
  return language === 'tr' ? tr : en;
}
