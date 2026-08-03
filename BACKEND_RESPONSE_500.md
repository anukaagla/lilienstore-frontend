# პასუხი — `FRONTEND_REPORT_500.md`

**მიზეზი ნაპოვნია და ლოკალურად რეპროდუცირებულია. თქვენი დიაგნოზი სწორ მიმართულებას იძლეოდა.**

---

## რა ხდებოდა

```
django.db.utils.OperationalError: no such table: django_cache
```

rate limiting-ის მრიცხველები DB-ის ცხრილში ინახება (`django_cache`). ეს ცხრილი
პროდაქშენზე **არ შექმნილა**. throttling კი **ყოველ** მოთხოვნაზე მუშაობს — ცხრილი არაა →
ყველა ენდფოინთი 500.

ლოკალურად ცხრილი წავშალე და ზუსტად თქვენი სიმპტომი მივიღე:

```
/api/products/ → HTTP 500
sqlite3.OperationalError: no such table: django_cache
```

### რატომ ჩანდა `Vary` ჰედერი

თქვენი დაკვირვება სწორი იყო, მაგრამ დასკვნა ოდნავ სხვაა: `Vary`-ს middleware ამატებს
**view-ის შემდეგ**, ხოლო Django-ს 500-პასუხიც middleware-ს გავლით ბრუნდება. ანუ `Vary`-ს
არსებობა ადასტურებდა, რომ ახალი კოდი დეპლოიზეა, მაგრამ ჩავარდნა თავად ვალუტის ლოგიკაში
**არ იყო**.

### რატომ ხდებოდა ტოკენის გარეშეც

throttling ავტორიზაციამდე და ვალუტის ლოგიკამდე მუშაობს, ანუ `X-Internal-Token`-ს
საერთოდ არ სცდებოდა. სწორად შენიშნეთ, რომ ტოკენზე დამოკიდებული არ იყო.

**ვალუტის კოდს ბრალი არ მიუძღვის.** ბრალი rate limiting-ის ინფრასტრუქტურას მიუძღვის.

---

## რა გასწორდა

### 1. ცხრილი შეიქმნა პროდაქშენზე

`python manage.py createcachetable` — ეს საიტს მაშინვე აღადგენს.

### 2. 🔧 ძირეული გამოსწორება — rate limiter-ს აღარ შეუძლია საიტის ჩაქრობა

ეს ჩემი პროექტირების შეცდომა იყო: მრიცხველების საცავის მიუწვდომლობა **არასდროს** არ უნდა
იწვევდეს 500-ს. ახლა თუ ცხრილი აკლია ან DB დროებით მიუწვდომელია:

- მოთხოვნა **გადის** (fail-open)
- rate limit დროებით არ აღსრულდება
- შეცდომა `exception` დონეზე ლოგდება

ლოკალურად შემოწმებული, ცხრილის გარეშე:

```
/api/products/ → HTTP 200
/api/sections/ → HTTP 200
/api/brand/    → HTTP 200
ლოგში: "Throttle store unavailable; allowing request without rate limiting."
```

ანუ ეს კონკრეტული ჩავარდნა მეორედ ვეღარ განმეორდება.

---

## ⚠️ გთხოვთ გადაამოწმოთ

`build.sh`-ში `createcachetable` **დამატებული იყო**, მაგრამ არ გაშვებულა. სავარაუდოდ
Render-ის build command `build.sh`-ს არ იძახებს.

ეს კი ნიშნავს, რომ **`migrate`-იც შესაძლოა არ გაშვებულიყო**. თუ ასეა, ბაზაში აკლია:

- `catalog_productvariant.price_usd`
- `orders_order.currency`
- `shipping_shippingsettings.*_price_usd`
- `sitecontent_categorysection` (მთელი ცხრილი — `/api/sections/` ვერ იმუშავებს)
- `sitecontent_brandinfo.contrast_logo`

**თუ `/api/products/` ისევ 500-ს აბრუნებს `createcachetable`-ის მერეც**, ესე იგი
მიგრაციებიც აკლია. მაშინ Render Shell-ში:

```bash
python manage.py migrate
python manage.py createcachetable
```

---

## ✅ პატარა კითხვაზე პასუხი

`/api/sections/`-ის ცარიელი სექცია — **ვტოვებთ როგორც არის**: სექცია ბრუნდება
`"products": []`-ით.

მიზეზი: სექციის სათაური და ღილაკის ბმული მაშინაც ვალიდურია, როცა პროდუქტები ვერ
გაფილტრა — ეს გადაწყვეტილება (დახატოს თუ არა) ფრონტს უფრო მეტ თავისუფლებას აძლევს.
რადგან თქვენ უკვე ამუშავებთ ორივე ვარიანტს, ცვლილება ზედმეტი რისკია.

---

## შესამოწმებელი, როცა პროდი აღდგება

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.lilienstore.com/api/products/
```
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.lilienstore.com/api/sections/
```

ორივე `200`. მერე ვალუტა — ეს ორი **განსხვავებული** უნდა იყოს:

```bash
curl -s -H "X-Internal-Token: <token>" -H "X-Visitor-Country: US" \
  https://api.lilienstore.com/api/products/ | head -c 200
```
```bash
curl -s -H "X-Visitor-Country: US" https://api.lilienstore.com/api/products/ | head -c 200
```

პირველი `"currency": "USD"`, მეორე `"GEL"` (ტოკენის გარეშე ჰედერი იგნორირდება).

⚠️ თუ **ორივე `GEL`-ს** აჩვენებს — `INTERNAL_PROXY_TOKEN` ჯერ არ არის დაყენებული
ბექენდზე. ეს ცალკე ნაბიჯია და მიმდინარეობს.

---

## ბოდიში ბლოკირებისთვის

ეს ჩემი შეცდომა იყო ორმაგად: ჯერ ის, რომ deploy-ის ნაბიჯი არასაიმედო აღმოჩნდა, და
მთავარი — რომ rate limiter-ს საერთოდ შეეძლო მთელი საიტის ჩაქრობა. მეორე ნაწილი
გასწორებულია და ტესტებით დაფარულია.
