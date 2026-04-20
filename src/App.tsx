import React, { useState } from 'react';
import { saveGameResult } from './lib/supabase';

// ==========================================
// [ 사운드 엔진 ]
// ==========================================
const SOUNDS = {
  pop: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  ding: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg',
  boing: 'https://actions.google.com/sounds/v1/cartoon/slip_and_slide_1.ogg',
  swoosh: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg'
};

const playSound = (type: keyof typeof SOUNDS) => {
  try {
    const audio = new Audio(SOUNDS[type]);
    audio.play().catch(e => console.log('Audio autoplay blocked', e));
  } catch (e) {}
};

export default function App() {
  // 4단계 마법사 상태: 1(올리기), 2(확인), 3(제작), 4(공유)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  
  // 폼 상태 (2단계)
  const [grade, setGrade] = useState('4학년');
  const [subject, setSubject] = useState('수학');
  const [gameType, setGameType] = useState('보스전');
  const [keywords, setKeywords] = useState(['타이머', '점수', '하트']);
  const [customKeyword, setCustomKeyword] = useState('');
  
  // 게임 피드백 상태 (3단계)
  const [feedback, setFeedback] = useState<string | null>(null);

  // 탭 정의 (줄바꿈 포함)
  const tabs = [
    { id: 1, label: '사진\n올리기' },
    { id: 2, label: '확인\n하기' },
    { id: 3, label: '제작\n하기' },
    { id: 4, label: '공유\n하기' }
  ] as const;

  const goToStep = (newStep: 1|2|3|4) => {
    playSound('pop');
    setStep(newStep);
  };

  // 사진 업로드 및 진~짜 AI 분석(Gemini)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playSound('ding');
      setLoading(true);

      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64Str = reader.result as string;
          const imageBase64 = base64Str.split(",")[1];
          const mimeType = file.type;

          const res = await fetch("/api/analyze-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64, mimeType })
          });

          if (res.ok) {
            const data = await res.json();
            setGrade(data.grade || "3학년");
            setSubject(data.subject || "수학");
            setGameType(data.gameType || "보스전");
            if (data.keywords && Array.isArray(data.keywords)) {
               setKeywords(data.keywords.slice(0, 4)); // 최대 4개까지만
            }
          } else {
            console.error("AI 분석 실패:", await res.text());
          }
          
          setLoading(false);
          setStep(2); // 분석 완료 후 확인 탭으로 넘어감
        };
      } catch (err) {
        console.error("File upload error", err);
        setLoading(false);
        setStep(2);
      }
    }
  };

  // 키워드 로직
  const handleAddKeyword = () => {
    playSound('pop');
    if (customKeyword.trim() && !keywords.includes(customKeyword.trim())) {
      setKeywords([...keywords, customKeyword.trim()]);
      setCustomKeyword('');
    }
  };

  const removeKeyword = (kwToRemove: string) => {
    playSound('pop');
    setKeywords(keywords.filter(kw => kw !== kwToRemove));
  };
  
  const handleMakeGame = () => {
    playSound('ding');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1500);
  };

  const handleAnswer = async (ans: string) => {
    if (ans === '3/4') {
      playSound('ding');
      setFeedback('와! 정답이야! 🎉');

      // 게임 결과를 Supabase에 저장!
      await saveGameResult({
        grade,
        subject,
        gameType,
        keywords,
        score: 1250,
      });

      // 정답을 맞추면 2초 뒤에 공유하기(4단계)로 자동 이동
      setTimeout(() => {
        playSound('swoosh');
        setStep(4);
      }, 2000);
      
    } else {
      playSound('boing');
      setFeedback('앗, 아쉬워! 다시 한번 생각볼래? 💪');
    }
  };

  return (
    <div 
      className="min-h-screen w-full relative text-[#1d1d1f] flex flex-col items-center justify-center bg-[#fdfdfd]" 
      style={{ fontFamily: "'Jua', 'Gowun Dodum', sans-serif" }}
    >
      {/* 🔮 전체 화면 투명 오버레이 & 배경 */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none" 
        style={{ backgroundImage: "url('https://i.imgur.com/93JyoSw.jpg')" }}
      ></div>
      <div className="fixed inset-0 z-0 bg-white/70 backdrop-blur-[15px] pointer-events-none"></div>

      {/* 📱 중앙 모바일 시뮬레이터 컨테이너 (고정 너비 430px) */}
      <div className="relative z-10 w-full max-w-[430px] mx-auto h-[100dvh] sm:h-[850px] bg-white/80 backdrop-blur-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col sm:my-8 sm:rounded-[50px] sm:border-[8px] sm:border-gray-200 overflow-hidden transition-all duration-300">
        
        {/* ✨ 헤더 & 타이틀 */}
        <header className="px-4 py-8 pb-5 text-center shrink-0">
           <h1 className="text-[26px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-violet-500 leading-tight">
              생각을 코딩하다
           </h1>
           <p className="text-[18px] text-gray-800 font-sans font-bold mt-1.5 opacity-90 tracking-wide">
             AI로 학습놀이 만들기 🚀
           </p>
        </header>

        {/* 📱 탭 바 (Wireframe 형태의 네모 버튼) */}
        <div className="px-5 pb-5 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => goToStep(t.id as 1|2|3|4)}
                className={`py-3.5 rounded-[16px] transition-all duration-300 font-sans font-bold text-[14px] md:text-[15px] leading-[1.3] flex items-center justify-center text-center whitespace-pre-wrap border-2 ${
                  step === t.id 
                    ? 'bg-violet-500 text-white border-violet-500 shadow-md transform scale-105 z-10' 
                    : 'bg-white/90 text-gray-700 border-gray-300 hover:bg-white scale-100 shadow-sm'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 🚀 스테이지 뷰포트 영역 */}
        <main className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col relative w-full h-full">

          {/* 로딩 오버레이 */}
          {loading && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in rounded-[30px]">
              <div className="text-6xl animate-bounce mb-5">🪄</div>
              <p className="text-violet-500 font-sans font-bold text-lg tracking-wide animate-pulse">
                AI 요정이 만들고 있어요...
              </p>
            </div>
          )}
          
          {/* 1단계: 사진 올리기 */}
          <div className={`flex flex-col gap-5 w-full h-full animate-in fade-in slide-in-from-right-4 duration-500 ${step === 1 ? 'block' : 'hidden'}`}>
            <div className="text-center space-y-1 mb-1 mt-1">
              <h2 className="text-[22px] text-gray-800">어떤 놀이를 만들까? 🤔</h2>
              <p className="text-[14px] text-gray-500 font-sans">문제집을 찍거나 고르면 뚝딱!</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label 
                className="flex flex-col items-center justify-center bg-sky-50/90 min-h-[120px] rounded-[24px] border-2 border-sky-200 shadow-sm transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-md"
              >
                <span className="text-4xl mb-2">📷</span>
                <span className="text-sky-600 text-[15px] font-sans font-bold tracking-wide">사진 찍기</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
              </label>
              <label 
                className="flex flex-col items-center justify-center bg-violet-50/90 min-h-[120px] rounded-[24px] border-2 border-violet-200 shadow-sm transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-md"
              >
                <span className="text-4xl mb-2">🖼️</span>
                <span className="text-violet-600 text-[15px] font-sans font-bold tracking-wide">갤러리 선택</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </div>

            <div className="flex-1 mt-2 mb-2 flex flex-col min-h-0">
              <div className="bg-white/70 backdrop-blur-[15px] rounded-[30px] p-5 shadow-sm border border-gray-200 flex flex-col items-center flex-1">
                <h3 className="text-gray-700 text-[15px] mb-3 font-sans font-bold bg-gray-100 px-4 py-1.5 rounded-full inline-block border border-gray-200">💡 찰칵! 캡처 예시</h3>
                <div className="relative w-full flex-1 rounded-[20px] overflow-hidden border-[6px] border-white shadow-md flex items-center justify-center bg-gray-100 min-h-[150px]">
                  <img src="https://i.imgur.com/HiesyJH.jpg" alt="학생 예시" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* 2단계: 확인 하기 */}
          <div className={`flex flex-col gap-4 w-full h-full animate-in fade-in slide-in-from-right-4 duration-500 ${step === 2 ? 'block' : 'hidden'}`}>
            <div className="text-center space-y-1 mb-1 mt-1">
              <h2 className="text-[22px] text-gray-800">인식 결과 확인! 🔍</h2>
              <p className="text-[14px] text-gray-500 font-sans">고칠 부분이 있다면 콕 눌러줘.</p>
            </div>

            <div className="bg-white/70 backdrop-blur-[15px] rounded-[30px] p-5 shadow-sm border border-gray-200 space-y-5 flex-1 overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[14px] text-gray-600 ml-1 font-sans font-bold">학년 🏫</label>
                  <select 
                    value={grade} onChange={(e) => { playSound('pop'); setGrade(e.target.value); }}
                    className="w-full bg-white border border-gray-200 focus:border-sky-400 rounded-[20px] px-3 py-3 outline-none shadow-sm text-[15px] text-gray-800 appearance-none min-h-[48px] font-sans font-bold"
                  >
                    {[1,2,3,4,5,6].map(g => <option key={g} value={`${g}학년`}>{g}학년</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[14px] text-gray-600 ml-1 font-sans font-bold">과목 📚</label>
                  <select 
                    value={subject} onChange={(e) => { playSound('pop'); setSubject(e.target.value); }}
                    className="w-full bg-white border border-gray-200 focus:border-sky-400 rounded-[20px] px-3 py-3 outline-none shadow-sm text-[15px] text-gray-800 appearance-none min-h-[48px] font-sans font-bold"
                  >
                    <option value="국어">국어</option>
                    <option value="수학">수학</option>
                    <option value="사회">사회</option>
                    <option value="과학">과학</option>
                    <option value="영어">영어</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[14px] text-gray-600 ml-1 font-sans font-bold">놀이 종류 🎮</label>
                <div className="grid grid-cols-2 gap-2">
                  {['퀴즈형', '액션형', '퍼즐형', '보스전'].map((type) => (
                    <button
                      key={type}
                      onClick={() => { playSound('pop'); setGameType(type); }}
                      className={`min-h-[48px] py-1 rounded-[20px] text-[15px] font-sans font-bold transition-all duration-300 active:scale-95 shadow-sm border-2 ${
                        gameType === type 
                          ? 'bg-sky-400 text-white border-sky-400' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[14px] text-gray-600 ml-1 font-sans font-bold">게임 아이템 & 키워드 ✨</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {keywords.map(kw => (
                    <span key={kw} className="bg-pink-100/90 text-pink-600 font-sans font-bold px-3 py-1.5 rounded-full text-[13px] flex items-center shadow-sm border border-pink-200">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="ml-1 text-pink-400 hover:text-pink-700 p-1 active:scale-95">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="직접 입력해볼까?"
                    className="flex-1 min-h-[48px] bg-white border border-gray-200 focus:border-violet-400 rounded-[20px] px-4 outline-none shadow-sm text-[15px] text-gray-800 font-sans font-bold"
                  />
                  <button 
                    onClick={handleAddKeyword}
                    className="min-h-[48px] bg-violet-500 text-white px-5 rounded-[20px] text-[15px] font-sans font-bold shadow-sm transition-all duration-300 active:scale-95 border border-violet-600"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleMakeGame}
              className="w-full shrink-0 bg-gradient-to-r from-sky-400 to-violet-500 text-white text-2xl min-h-[60px] py-3 mt-1 rounded-[24px] shadow-[0_10px_20px_rgba(167,139,250,0.3)] transition-all duration-300 active:scale-95 flex items-center justify-center space-x-2 tracking-wide font-bold"
            >
              <span className="text-2xl">✨</span>
              <span>진짜 놀이 만들기!</span>
            </button>
          </div>

          {/* 3단계: 제작 하기 (게임 플레이) */}
          <div className={`flex flex-col w-full h-full animate-in fade-in slide-in-from-right-4 duration-500 ${step === 3 ? 'block' : 'hidden'}`}>
            
            <div className="text-center space-y-1 mb-3 mt-1 hidden">
              <h2 className="text-[22px] text-gray-800">놀이 시작! 🎮</h2>
            </div>
            
            <div className="bg-white/80 backdrop-blur-[15px] border-2 border-white rounded-[36px] overflow-hidden shadow-lg flex flex-col flex-1 relative min-h-[400px]">
              
              {/* 상단 HUD */}
              <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md rounded-[16px] py-1.5 px-3 flex flex-col items-center shadow-sm border border-gray-100">
                  <span className="text-[11px] text-gray-500 font-sans font-bold mb-0.5">점수 ⭐</span>
                  <span className="text-lg text-sky-500 leading-none">1,250</span>
                </div>
                <div className="bg-white/90 backdrop-blur-md rounded-[16px] py-1.5 px-3 flex flex-col items-center shadow-sm border border-gray-100">
                  <span className="text-[11px] text-gray-500 font-sans font-bold mb-0.5">체력 💖</span>
                  <div className="flex space-x-0.5 text-sm">
                    <span>❤️</span><span>❤️</span><span className="opacity-30">❤️</span>
                  </div>
                </div>
              </div>

              {/* 중앙 보스 영역 */}
              <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-4 relative min-h-[220px]">
                <div className="absolute top-8 w-full text-center px-4 animate-pulse">
                   <p className="inline-block bg-sky-100 text-sky-600 px-3 py-1 rounded-full text-[13px] font-sans font-bold tracking-wide border border-sky-200 shadow-sm">
                     {grade} {subject} 마스터 도전! 🔥
                   </p>
                </div>

                <div className="w-32 h-32 bg-pink-100 rounded-full border-[5px] border-white shadow-xl relative flex items-center justify-center animate-bounce duration-1000 mt-4">
                  <div className="absolute -top-4 bg-pink-500 text-white font-sans font-bold text-[12px] px-3 py-1 rounded-full shadow-md z-10 whitespace-nowrap tracking-wide border border-white">
                    보스: 거대 괴물 👾
                  </div>
                  <span className="text-6xl drop-shadow-md">👾</span>
                  {/* 체력바 */}
                  <div className="absolute -bottom-2 w-24 h-3 bg-white/90 rounded-full border border-gray-200 shadow-sm overflow-hidden">
                    <div className="w-2/3 h-full bg-pink-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* 하단 문제 및 보기 영역 */}
              <div className="bg-white p-5 md:p-6 rounded-t-[36px] border-t-2 border-gray-100 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-8 mt-4">
                <h3 className="text-center text-[22px] text-gray-800 mb-4 drop-shadow-sm leading-snug">
                  1/4 더하기 2/4 의<br />정답은 무얼까? 😊
                </h3>

                {feedback && (
                  <div className="text-center text-[16px] text-violet-500 mb-4 font-sans font-bold animate-in fade-in zoom-in h-6">
                    {feedback}
                  </div>
                )}
                {!feedback && <div className="h-6 mb-4"></div>}

                <div className="grid grid-cols-2 gap-3 pb-2">
                  {['3/4', '2/8', '3/8', '4/4'].map((ans) => (
                    <button 
                      key={ans} 
                      onClick={() => handleAnswer(ans)}
                      className="bg-white border-2 border-gray-200 py-4 min-h-[60px] rounded-[20px] shadow-sm text-2xl text-gray-700 transition-all duration-300 active:scale-95 hover:bg-sky-50 hover:border-sky-300 font-bold"
                    >
                      {ans}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4단계: 공유 하기 */}
          <div className={`flex flex-col gap-6 w-full h-full animate-in fade-in slide-in-from-right-4 duration-500 ${step === 4 ? 'block' : 'hidden'}`}>
            <div className="text-center space-y-1 mb-2 mt-4">
              <h2 className="text-[24px] text-gray-800">놀이 만들기 성공 🎉</h2>
              <p className="text-[14px] text-gray-500 font-sans">바코드나 링크로 친구들에게 공유해봐!</p>
            </div>

            <div className="bg-white/70 backdrop-blur-[15px] rounded-[40px] p-8 shadow-sm border border-gray-200 flex-1 flex flex-col items-center justify-center w-full">
              
              {/* 바코드/QR 가짜 영역 UI */}
              <div className="bg-white p-6 rounded-[30px] shadow-md border border-gray-100 mb-8 transform transition-transform hover:scale-105 duration-300">
                <div className="w-40 h-40 border-4 border-dashed border-violet-300 rounded-[20px] flex items-center justify-center bg-violet-50">
                   <div className="text-center space-y-1.5">
                      <div className="text-5xl">📱</div>
                      <div className="text-violet-500 font-sans font-black text-[13px] tracking-widest mt-1">QR CODE</div>
                   </div>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button 
                  onClick={() => playSound('pop')}
                  className="flex-1 flex flex-col items-center justify-center bg-sky-50 text-sky-600 transition-all duration-300 active:scale-95 space-y-2 py-5 rounded-[24px] border border-sky-200 hover:bg-sky-100 shadow-sm"
                >
                  <span className="text-3xl">🔗</span>
                  <span className="text-[15px] font-sans font-bold">링크 복사</span>
                </button>
                <button 
                  onClick={() => playSound('pop')}
                  className="flex-1 flex flex-col items-center justify-center bg-pink-50 text-pink-600 transition-all duration-300 active:scale-95 space-y-2 py-5 rounded-[24px] border border-pink-200 hover:bg-pink-100 shadow-sm"
                >
                  <span className="text-3xl">⬇️</span>
                  <span className="text-[15px] font-sans font-bold">그림 저장</span>
                </button>
              </div>

            </div>

            <button
               onClick={() => goToStep(1)}
               className="w-full shrink-0 bg-white text-gray-600 text-[16px] font-sans font-bold mb-2 py-4 rounded-[24px] shadow-sm transition-all duration-300 active:scale-95 min-h-[56px] border border-gray-200"
            >
               처음으로 돌아가기 🔄
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}
