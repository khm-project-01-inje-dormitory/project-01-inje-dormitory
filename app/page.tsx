import Link from "next/link";
import { ArrowRight, Banknote, CarFront, Clock3, Footprints, Home as HomeIcon, MapPin, Sparkles, Star, Users, Search } from "lucide-react";
import PhotoGallery from "@/components/PhotoGallery";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { store, computeAvailability } from "@/lib/store";
import { addDays, fmtDateKorean, fmtWon, maskName, todayKST } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0; // 캐시 완전 금지 — 설정 변경이 즉시 반영
export const fetchCache = "force-no-store";

export default async function Home() {
  const [settings, photos, reservations, blocked, allReviews] = await Promise.all([
    store.getSettings(),
    store.listPhotos(),
    store.listReservations(),
    store.listBlockedDates(),
    store.listReviews(),
  ]);
  const days = computeAvailability(
    reservations,
    todayKST(),
    addDays(todayKST(), 15),
    settings.max_guests,
    blocked.map((b) => b.date)
  );
  // 대문: hero 사진 중 "표시중"으로 선택된 1장 → 없으면 첫 hero → 없으면 기존 데이터 호환(첫 사진)
  const heroPhotos = photos.filter((p) => p.kind === "hero");
  const galleryPhotos = photos.filter((p) => p.kind !== "hero");
  const hero = heroPhotos.find((p) => p.active)?.url ?? heroPhotos[0]?.url ?? photos[0]?.url;
  const visibleReviews = allReviews.filter((r) => r.visible).slice(0, 4);
  const reviewCount = allReviews.filter((r) => r.visible).length;
  const reviewAvg = reviewCount
    ? Math.round((allReviews.filter((r) => r.visible).reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
    : 0;
  const mapLink =
    settings.map_link ||
    (settings.address ? `https://map.kakao.com/?q=${encodeURIComponent(settings.address)}` : "");

  return (
    <main className="pb-28">
      {/* ── 히어로 ── */}
      <section className="relative min-h-[72vh] flex items-end overflow-hidden">
        {hero ? (
          <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
        <div className="relative max-w-5xl mx-auto w-full px-5 pb-12 pt-24 text-white">
          {settings.hero_badge_visible !== false && (
            <span className="badge bg-white/15 backdrop-blur text-white border border-white/20">
              <HomeIcon className="w-3.5 h-3.5" /> {settings.hero_badge_text || "집 전체 대여 · 방 선택 없이 자유롭게"}
            </span>
          )}
          <h1 className="mt-4 text-4xl sm:text-6xl font-black leading-[1.1] tracking-tight drop-shadow">
            {settings.pension_name}
          </h1>
          {settings.tagline_visible && (
            <p className="mt-3 text-base sm:text-xl font-medium text-white/90 drop-shadow">
              {settings.tagline}
            </p>
          )}
          {/* CTA: 가격 칩(내용에 맞춰 폭 자동) + 예약하기(남은 폭 채움) — 글자 길이가 늘어나도 칩이 자연스럽게 커짐 */}
          <div className="mt-6 flex gap-2.5 w-full max-w-md">
            <div className="h-12 px-3 sm:px-4 rounded-xl bg-white/95 text-foreground shadow-pop inline-flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
              <span className="text-xs font-bold text-muted-foreground">1인·1박</span>
              <span className="text-base font-black text-primary tabular-nums">{fmtWon(settings.per_person_price)}</span>
            </div>
            {settings.booking_paused ? (
              <div className="flex-1 h-12 rounded-xl bg-white/25 text-white inline-flex items-center justify-center gap-2 text-sm font-bold backdrop-blur cursor-not-allowed border border-white/30">
                예약 일시 중지
              </div>
            ) : (
              <Link href="/reserve" className="btn-primary flex-1 h-12 !py-0 !rounded-xl !text-base">
                예약하기 <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {/* 모바일에서는 하단 고정바와 중복되므로 PC(sm+)에서만 표시 */}
            <Link href="/lookup"
              className="flex-1 h-12 !py-0 !rounded-xl hidden sm:inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-white/15 text-white border border-white/30 backdrop-blur hover:bg-white/25 transition-colors"
              title="이름·연락처로 내 예약 찾기">
              <Search className="w-4 h-4" /> 예약조회
            </Link>
          </div>
        </div>
      </section>

      {settings.booking_paused && (
        <div className="max-w-5xl mx-auto px-5 mt-6">
          <div className="card-surface p-5 border-2 border-warning/40 bg-warning/10">
            <p className="text-sm font-bold text-warning">🌊 {settings.booking_pause_message || "현재 예약이 일시 중지되어 있습니다."}</p>
            {settings.booking_resume_date && /^\d{4}-\d{2}-\d{2}$/.test(settings.booking_resume_date) && (
              <p className="text-xs font-semibold text-warning mt-1.5">예약은 {settings.booking_resume_date.replace(/-/g, ".")}부터 가능합니다.</p>
            )}
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-5 space-y-10 mt-10">
        {/* ── 소개 ── */}
        <section className="grid sm:grid-cols-3 gap-3">
          {([
            { show: settings.feature1_visible !== false, icon: <HomeIcon className="w-5 h-5" />, title: settings.feature1_title || "집 전체 통대여", body: settings.feature1_body || settings.tagline || "도착하시면 집 안 어느 방에서든 자유롭게 머무실 수 있습니다." },
            { show: settings.feature2_visible !== false, icon: <Users className="w-5 h-5" />, title: settings.feature2_title || `최대 ${settings.max_guests}명`, body: settings.feature2_body || "인원 단위 예약으로 가족·친구 모임에 딱 맞습니다." },
            { show: settings.feature3_visible !== false, icon: <Banknote className="w-5 h-5" />, title: settings.feature3_title || "간편 입금 결제", body: settings.feature3_body || "카카오페이·토스로 바로 송금하세요. 카드 결제 없음." },
          ] as const).filter((f) => f.show).filter((f) => f.show).map((f) => (
            <div key={f.title} className="card-surface p-5">
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">{f.icon}</div>
              <div className="mt-3 font-extrabold">{f.title}</div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        {/* ── 갤러리 ── */}
        <section>
          <h2 className="text-xl font-black flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" /> {settings.pension_name} 둘러보기
          </h2>
          <PhotoGallery photos={galleryPhotos.length ? galleryPhotos : photos} />
        </section>

        {/* ── 예약 현황 ── */}
        <section>
          <h2 className="text-xl font-black flex items-center gap-2 mb-4">
            <Clock3 className="w-5 h-5 text-primary" /> 이번 2주 예약 현황
          </h2>
          <AvailabilityCalendar days={days} />
          <p className="text-xs text-muted-foreground mt-2">
            {fmtDateKorean(todayKST())} 기준 · 박 단위 잔여 인원입니다.
          </p>
        </section>

        {/* ── 손님 후기 ── */}
        {visibleReviews.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Star className="w-5 h-5 text-warning fill-warning" /> 손님이 남긴 후기
              </h2>
              <span className="text-sm font-extrabold text-amber-500">★ {reviewAvg} <span className="text-muted-foreground font-medium">· {reviewCount}건</span></span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {visibleReviews.map((r) => (
                <div key={r.id} className="card-surface p-5">
                  <div className="flex items-center justify-between">
                    <b className="text-sm">{maskName(r.guest_name)}</b>
                    <span className="inline-flex gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? "fill-current" : "fill-none opacity-30"}`} />
                      ))}
                    </span>
                  </div>
                  <p className="text-sm mt-2 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 이용 안내 ── */}
        <section className="grid sm:grid-cols-2 gap-3">
          <div className="card-surface p-6">
            <h3 className="font-black mb-3">이용 시간</h3>
            <ul className="space-y-2 text-sm">
              {/* 라벨-값 인접 좌측 정렬: 좌우 쏠림 제거 (모바일·PC 동일 패턴) */}
              <li className="flex items-baseline gap-3"><span className="w-16 shrink-0 text-muted-foreground">체크인</span><b className="tabular-nums">{settings.check_in_time}</b></li>
              <li className="flex items-baseline gap-3"><span className="w-16 shrink-0 text-muted-foreground">체크아웃</span><b className="tabular-nums">{settings.check_out_time}</b></li>
              <li className="flex items-baseline gap-3"><span className="w-16 shrink-0 text-muted-foreground">문의 전화</span><b className="tabular-nums">{settings.contact_phone || "등록 전"}</b></li>
            </ul>
          </div>
          <div className="card-surface p-6">
            <h3 className="font-black mb-3">예약 방법</h3>
            <ol className="space-y-2.5 text-sm">
              {[
                "날짜·인원을 선택해 예약을 신청합니다.",
                "안내된 계좌로 카카오페이/토스로 송금합니다.",
                "관리자가 입금을 확인하면 예약이 확정됩니다.",
              ].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 위치 · 주차 안내 ── */}
        {(settings.address || settings.map_link || settings.parking_info || settings.arrival_info) && (
          <section className="card-surface p-6">
            <h2 className="text-xl font-black mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> 오시는 길
            </h2>
            <div className="space-y-2.5 text-sm">
              {/* 라벨-값 인접 좌측 정렬: 긴 주소도 왼쪽 기준 자연 줄바꿈 (break-keep) */}
              {settings.address && (
                <div className="flex items-start gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground">주소</span>
                  <span className="font-semibold break-keep">{settings.address}</span>
                </div>
              )}
              {settings.parking_info && (
                <div className="flex items-start gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground flex items-center gap-1"><CarFront className="w-3.5 h-3.5" />주차</span>
                  <span className="font-semibold break-keep">{settings.parking_info}</span>
                </div>
              )}
              {settings.arrival_info && (
                <div className="flex items-start gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground flex items-center gap-1"><Footprints className="w-3.5 h-3.5" />안내</span>
                  <span className="font-semibold break-keep">{settings.arrival_info}</span>
                </div>
              )}
            </div>
            {mapLink && (
              <a href={mapLink} target="_blank" rel="noopener" className="btn-soft w-full mt-4 !py-2.5 text-sm">
                <MapPin className="w-4 h-4" /> 지도에서 열기
              </a>
            )}
          </section>
        )}

        <section className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{settings.description}</section>

        <footer className="border-t border-border py-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {settings.pension_name}</span>
          <Link href="/admin" className="hover:text-foreground">관리자 페이지</Link>
        </footer>
      </div>

      {/* 모바일 sticky 예약 버튼 */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-2.5 pb-3 bg-background/90 backdrop-blur border-t border-border sm:hidden z-40">
        <div className="flex items-center gap-2">
          <Link href="/lookup" className="btn-outline !py-2.5 !px-3.5 text-xs shrink-0 inline-flex items-center gap-1">
            <Search className="w-3.5 h-3.5" /> 예약 조회
          </Link>
          {settings.booking_paused ? (
            <div className="btn-primary flex-1 !py-2.5 text-[15px] text-center opacity-60 pointer-events-none">예약 일시 중지</div>
          ) : (
            <Link href="/reserve" className="btn-primary flex-1 !py-2.5 text-[15px]">
              원하는 날짜로 예약하기 <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
