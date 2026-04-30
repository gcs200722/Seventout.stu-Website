const items = [
  {
    title: "Chon mau thiet ke",
    description:
      "Kho giao dien tinh te, duoc do ni dong giay cho cac thuong hieu thoi trang local cao cap.",
  },
  {
    title: "Keo va tha noi dung",
    description:
      "Khong can kien thuc lap trinh. Tu tay sap dat Lookbook, San pham va Cau chuyen cua ban.",
  },
  {
    title: "Bat dau ban hang",
    description:
      "Ket noi thanh toan va van chuyen chi trong mot click. Thuong hieu cua ban san sang bung no.",
  },
];

export function PlatformLandingEasyFactor() {
  return (
    <section id="features" className="bg-[#fdf8f8] py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-3 md:px-16">
        {items.map((item, index) => (
          <div
            key={item.title}
            className="reveal text-center"
            style={{ transitionDelay: `${(index + 1) * 100}ms` }}
          >
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-2xl">
              {index + 1}
            </div>
            <h3 className="mb-4 text-2xl">{item.title}</h3>
            <p className="text-zinc-600">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
