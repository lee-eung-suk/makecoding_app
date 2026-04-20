import React, { useState, useRef, useEffect } from 'react';
import { saveGameResult } from './lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

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

// ==========================================
// [ 게임 플레이어 (URL 접속 시 렌더링) ]
// ==========================================
function GamePlayer({ grade, subject, gameType, keywords, gameContent, onClose }: any) {
  const [stageIndex, setStageIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hp, setHp] = useState(3);
  const [score, setScore] = useState(0);

  // 로딩이나 데미 데이터 예외 처리
  if (!gameContent || !gameContent.stages || gameContent.stages.length === 0) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center p-4">
        <div className="animate-pulse text-sky-500 font-bold">API 연결 중이거나 데이터가 부족합니다! 😅</div>
      </div>
    );
  }

  const isClear = stageIndex >= gameContent.stages.length;
  const currentStage = isClear ? gameContent.stages[gameContent.stages.length - 1] : gameContent.stages[stageIndex];
  
  // 보스 체력 바 (스테이지가 지날 때마다 체력이 줄어드는 연출)
  const totalStages = gameContent.stages.length;
  const bossHpPercent = isClear ? 0 : 100 - (stageIndex / totalStages) * 100;

  const handleAnswer = async (ans: string) => {
    if (isClear || hp <= 0) return;

    if (ans === currentStage.answer) {
      playSound('ding');
      setFeedback(currentStage.successMessage || '공격 성공! 💥');
      setScore(s => s + 500);
      
      // 정답 맞추면 1.5초 후 다음 스테이지로
      setTimeout(() => {
        playSound('swoosh');
        setFeedback(null);
        setStageIndex(i => i + 1);
        
        // 만약 방금 푼 게 마지막 문제라면 클리어 알림
        if (stageIndex + 1 >= totalStages) {
          setTimeout(() => {
            alert(`🎉 대단해요! [${gameContent.title}] 클리어!\n최종 점수는 ${score + 500}점입니다! 😊`);
            if (onClose) onClose();
          }, 500);
        }
      }, 1500);
      
    } else {
      playSound('boing');
      setHp(h => Math.max(0, h - 1));
      setFeedback('앗, 빗나갔어! 다시 생각해보자! 💪');
      
      if (hp - 1 <= 0) {
        setTimeout(() => {
          alert("체력을 모두 잃었어요. 다시 처음부터 도전해볼까요? 🥺");
          setHp(3);
          setScore(0);
          setStageIndex(0);
          setFeedback(null);
        }, 1000);
      }
    }
  };

  return (
    <div className="w-full h-full min-h-[100dvh] flex flex-col bg-[#fdfdfd] relative" style={{ fontFamily: "'Jua', 'Gowun Dodum', sans-serif" }}>
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: "url('https://i.imgur.com/93JyoSw.jpg')" }}></div>
      <div className="fixed inset-0 z-0 bg-white/70 backdrop-blur-[15px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[430px] mx-auto h-[100dvh] bg-white/80 backdrop-blur-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
        
        {/* 상단 HUD */}
        <div className="flex justify-between p-4 z-10 shrink-0 select-none">
          {onClose && (
            <button onClick={onClose} className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-gray-700 shadow-sm border border-gray-200 active:scale-90 mr-3 text-2xl font-bold">
              ✕
            </button>
          )}
          <div className="bg-white/90 backdrop-blur-md rounded-[16px] py-1.5 px-4 flex flex-col items-center shadow-sm border border-gray-200 flex-1">
            <span className="text-[12px] text-gray-500 font-sans font-bold mb-0.5">점수 ⭐</span>
            <span className="text-xl text-sky-500 leading-none font-bold">{score.toLocaleString()}</span>
          </div>
          <div className="bg-white/90 backdrop-blur-md rounded-[16px] py-1.5 px-4 flex flex-col items-center shadow-sm border border-gray-200 ml-3">
            <span className="text-[12px] text-gray-500 font-sans font-bold mb-0.5">체력 💖</span>
            <div className="flex space-x-1 text-base">
              {[1,2,3].map(i => (
                <span key={i} className={i <= hp ? "" : "opacity-30"}>❤️</span>
              ))}
            </div>
          </div>
        </div>

        {/* 중앙 스토리 및 보스 영역 */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-4 text-center">
          
          <div className="absolute top-0 w-full px-4 mb-2 animate-in fade-in slide-in-from-top-2">
            <h2 className="text-xl text-indigo-700 font-black drop-shadow-sm mb-1">{gameContent.title || "미니 놀이 대모험"}</h2>
            {stageIndex === 0 && !feedback && (
               <p className="text-[14px] text-gray-700 font-sans font-bold bg-white/80 px-4 py-2 rounded-2xl shadow-sm border border-gray-200">
                 {gameContent.intro}
               </p>
            )}
          </div>

          {!isClear ? (
             <div className="w-32 h-32 md:w-40 md:h-40 bg-pink-100 rounded-full border-[5px] border-white shadow-xl relative flex items-center justify-center animate-bounce duration-1000 mt-16 transition-all">
               <div className="absolute -top-4 bg-pink-500 text-white font-sans font-bold text-[13px] px-4 py-1 rounded-full shadow-md z-10 whitespace-nowrap tracking-wide border border-white">
                 {gameContent.bossName || "보스"}
               </div>
               <span className="text-6xl md:text-7xl drop-shadow-md">👾</span>
               
               {/* 보스 체력 표시 바 */}
               <div className="absolute -bottom-3 w-28 h-3.5 bg-white/90 rounded-full border border-gray-200 shadow-sm overflow-hidden p-0.5">
                 <div className="h-full bg-pink-500 rounded-full transition-all duration-500" style={{ width: `${bossHpPercent}%` }}></div>
               </div>
             </div>
          ) : (
             <div className="mt-16 animate-in zoom-in spin-in-12 duration-700">
               <span className="text-8xl drop-shadow-xl">🏆</span>
               <h3 className="text-2xl text-sky-500 font-black mt-4">완벽하게 정복 완료!</h3>
             </div>
          )}
        </div>

        {/* 하단 문제 영역 */}
        <div className="bg-white p-5 md:p-6 rounded-t-[36px] border-t-2 border-gray-100 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-8 z-20">
          {!isClear ? (
            <>
              <div className="mb-2 w-full flex justify-center">
                <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                  ROUND {stageIndex + 1}
                </span>
              </div>
              <p className="text-center text-[15px] font-sans font-bold text-gray-500 mb-2">
                {currentStage.mission}
              </p>
              <h3 className="text-center text-[20px] md:text-[22px] text-gray-800 mb-4 drop-shadow-sm leading-snug font-black whitespace-pre-wrap">
                {currentStage.question}
              </h3>

              {feedback && (
                <div className="text-center text-[18px] text-violet-500 mb-4 font-sans font-bold animate-in fade-in zoom-in h-7">
                  {feedback}
                </div>
              )}
              {!feedback && <div className="h-7 mb-4"></div>}

              <div className="grid grid-cols-2 gap-3 pb-2">
                {(currentStage.options || []).map((ans: string) => (
                  <button 
                    key={ans} 
                    onClick={() => handleAnswer(ans)}
                    className="bg-white border-2 border-gray-200 py-4 md:py-5 min-h-[60px] rounded-[24px] shadow-sm text-[16px] md:text-[18px] text-gray-700 transition-all duration-200 active:scale-95 hover:bg-sky-50 hover:border-sky-400 font-bold break-words px-2"
                  >
                    {ans}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
               <p className="text-xl text-gray-700 font-bold mb-4">정말 잘했어! 다음 스테이지도 기대할게!</p>
               <button onClick={onClose} className="bg-sky-500 text-white font-bold text-xl px-10 py-4 rounded-full shadow-lg active:scale-95">
                 돌아가기
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // 플레이 모드 상태 (URL에 ?play=... 접속 시 true)
  const [isPlayMode, setIsPlayMode] = useState(false);

  // 4단계 마법사 상태: 1(올리기), 2(확인), 3(제작), 4(공유)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  
  // 폼 상태 (2단계)
  const [grade, setGrade] = useState('4학년');
  const [subject, setSubject] = useState('수학');
  const [gameType, setGameType] = useState('보스전');
  const [keywords, setKeywords] = useState(['타이머', '점수', '하트']);
  const [customKeyword, setCustomKeyword] = useState('');
  
  // 생성된 URL 상태
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [gameContent, setGameContent] = useState<any>(null); // AI가 생성한 게임 데이터

  // ==========================================
  // [ 카메라 엔진 ]
  // ==========================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // 접속 시 URL 확인. play 쿼리스트링이 있으면 플레이 모드로 진입!
    const searchParams = new URLSearchParams(window.location.search);
    const playData = searchParams.get('play');
    if (playData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(playData)));
        setGrade(decoded.grade);
        setSubject(decoded.subject);
        setGameType(decoded.gameType);
        setKeywords(decoded.keywords);
        setGameContent(decoded.gameContent); // 추가!
        setIsPlayMode(true);
      } catch (err) {
        console.error("Failed to parse play data", err);
      }
    }
  }, []);

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

  const copyLink = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      playSound('ding');
      alert('링크가 복사되었습니다! 📋🔗\n' + generatedUrl);
    }
  };

  // 공통 이미지 분석 함수
  const analyzeImage = async (base64DataUrl: string, mimeType: string) => {
    playSound('ding');
    setLoading(true);

    try {
      const imageBase64 = base64DataUrl.split(",")[1];

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
           setKeywords(data.keywords.slice(0, 4));
        }
      } else {
        const errText = await res.text();
        console.error("AI 분석 실패:", errText);
        alert(`API 오류가 발생했습니다. (설정에서 올바른 API 키를 입력했는지 확인해주세요!)\n\n상세:${errText}`);
      }
    } catch (err) {
      console.error("Analysis error", err);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
      setStep(2);
    }
  };

  // 사진 업로드
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        analyzeImage(reader.result as string, file.type);
      };
    }
  };

  // 인앱 카메라 열기 (웹캠/모바일 카메라 지원)
  const openCamera = async () => {
    playSound('pop');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("카메라 및 웹캠 권한이 필요합니다! 브라우저 설정(주소창 자물쇠 아이콘)에서 권한을 허용해주세요. 😊");
    }
  };

  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  // 카메라 닫기
  const closeCamera = () => {
    playSound('pop');
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // 찰칵!
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      playSound('pop');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      closeCamera();
      analyzeImage(dataUrl, 'image/jpeg');
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
  
  const handleMakeGame = async () => {
    playSound('ding');
    setLoading(true);
    
    try {
      // 1. AI에게 게임 데이터 생성 요청
      const res = await fetch("/api/generate-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, subject, gameType, keywords })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`게임 생성 API 호출 실패: ${errorText}`);
      }
      
      const generatedContent = await res.json();
      setGameContent(generatedContent);

      // 2. 게임 결과를 Supabase에 저장 (더미 점수)
      await saveGameResult({
        grade,
        subject,
        gameType,
        keywords,
        score: 0,
      });

      // 3. 진짜로 플레이 가능한 URL (base64 인코딩) 생성
      const gameConfig = { grade, subject, gameType, keywords, gameContent: generatedContent };
      const base64Config = btoa(encodeURIComponent(JSON.stringify(gameConfig)));
      const baseUrl = window.location.href.split('?')[0];
      const realPlayUrl = `${baseUrl}?play=${base64Config}`;
      
      setGeneratedUrl(realPlayUrl);
      setLoading(false);
      setStep(3);

    } catch (e: any) {
      console.error(e);
      alert(`게임 생성에 실패했습니다. (API 키를 갱신하거나 확인해주세요!)\n\n상세: ${e?.message || e}`);
      setLoading(false);
    }
  };

  if (isPlayMode) {
    return <GamePlayer grade={grade} subject={subject} gameType={gameType} keywords={keywords} gameContent={gameContent} />;
  }

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
        
        {/* 인앱 카메라 오버레이 */}
        {isCameraOpen && (
          <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in-95 duration-300">
             <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
               <canvas ref={canvasRef} className="hidden" />
               <div className="absolute top-4 left-0 right-0text-center flex justify-center pointer-events-none">
                 <div className="bg-black/40 text-white px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-md">마법의 렌즈 🪄</div>
               </div>
             </div>
             <div className="p-6 bg-black/90 flex items-center justify-around pb-10">
                <button 
                  onClick={closeCamera} 
                  className="w-14 h-14 rounded-full bg-gray-800 text-white flex items-center justify-center text-2xl font-sans active:scale-90 transition-transform"
                >
                  ✕
                </button>
                <button 
                  onClick={takePhoto} 
                  className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center p-1.5 active:scale-90 transition-transform"
                >
                  <div className="w-full h-full bg-white rounded-full"></div>
                </button>
                <div className="w-14 h-14"></div> {/* 레이아웃 밸런스 */}
             </div>
          </div>
        )}

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
              <button 
                onClick={openCamera}
                className="flex flex-col items-center justify-center bg-sky-50/90 min-h-[120px] rounded-[24px] border-2 border-sky-200 shadow-sm transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-md"
              >
                <span className="text-4xl mb-2">📷</span>
                <span className="text-sky-600 text-[15px] font-sans font-bold tracking-wide">사진 찍기</span>
              </button>
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
              disabled={loading}
              className={`w-full shrink-0 bg-gradient-to-r from-sky-400 to-violet-500 text-white min-h-[60px] py-3 mt-1 rounded-[24px] shadow-[0_10px_20px_rgba(167,139,250,0.3)] transition-all duration-300 flex items-center justify-center space-x-2 tracking-wide font-bold ${loading ? 'opacity-90' : 'active:scale-95'}`}
            >
              <span className="text-2xl">{loading ? '⏳' : '✨'}</span>
              <span className="text-[20px] md:text-[22px]">{loading ? 'AI가 게임 문제를 창조하고 있어요...' : '진짜 놀이 만들기!'}</span>
            </button>
          </div>

          {/* 3단계: 제작 하기 (결과 URL 렌더링 엔진) */}
          <div className={`flex flex-col w-full h-full animate-in fade-in slide-in-from-right-4 duration-500 ${step === 3 ? 'block' : 'hidden'}`}>
            <div className="text-center space-y-1 mb-6 mt-4">
              <h2 className="text-[26px] text-gray-800 font-black">🎉 게임 완성!</h2>
              <p className="text-[15px] text-gray-500 font-sans font-bold">와! 나만의 게임이 완성됐어!<br/>웹에서 바로 실행할 수 있는 URL이 나왔어.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-[15px] border-2 border-sky-100 rounded-[36px] p-6 shadow-xl flex flex-col flex-1 relative mb-6 items-center justify-center space-y-6">
              
              <div className="w-full bg-gray-50 p-4 rounded-[20px] border border-gray-200 shadow-inner flex flex-col items-center">
                <span className="text-[13px] text-gray-500 font-sans font-bold mb-2">당신의 고유 게임 주소</span>
                <span className="text-sky-500 font-sans font-bold text-center break-all w-full px-2">
                  {generatedUrl || "게임이 준비중입니다..."}
                </span>
              </div>

              <button 
                onClick={() => setIsGameModalOpen(true)}
                className="w-full bg-violet-500 text-white min-h-[64px] rounded-[24px] shadow-[0_10px_20px_rgba(139,92,246,0.3)] transition-all duration-300 active:scale-95 flex items-center justify-center space-x-2 font-bold text-xl"
              >
                <span>▶️ 게임 실행하기</span>
              </button>
              
              <button 
                onClick={copyLink}
                className="w-full bg-white text-sky-600 border-2 border-sky-200 min-h-[64px] rounded-[24px] shadow-sm transition-all duration-300 active:scale-95 flex items-center justify-center space-x-2 font-bold text-lg"
              >
                <span>📋 링크 복사</span>
              </button>
              
            </div>
            
            <button
               onClick={() => goToStep(4)}
               className="w-full shrink-0 bg-gray-800 text-white text-[16px] font-sans font-bold mb-2 py-4 rounded-[24px] shadow-md transition-all duration-300 active:scale-95 min-h-[56px]"
            >
               친구들에게 공유해볼까? 💌
            </button>
          </div>

          {/* 인게임 모달 (실제 작동하는 게임 시뮬레이터) */}
          {isGameModalOpen && (
            <div className="absolute inset-0 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="absolute inset-0 flex flex-col bg-white">
                <GamePlayer 
                  grade={grade} 
                  subject={subject} 
                  gameType={gameType} 
                  keywords={keywords} 
                  gameContent={gameContent} 
                  onClose={() => setIsGameModalOpen(false)} 
                />
              </div>
            </div>
          )}

          {/* 4단계: 공유 하기 */}
          <div className={`flex flex-col gap-6 w-full h-full animate-in fade-in slide-in-from-right-4 duration-500 ${step === 4 ? 'block' : 'hidden'}`}>
            <div className="text-center space-y-1 mb-2 mt-4">
              <h2 className="text-[26px] text-gray-800 font-black">📱 친구랑 같이 해보자!</h2>
              <p className="text-[14px] text-gray-500 font-sans">바코드를 스캔하면 내 폰에서 바로 실행돼요!</p>
            </div>

            <div className="bg-white/70 backdrop-blur-[15px] rounded-[40px] p-8 shadow-sm border border-gray-200 flex-1 flex flex-col items-center justify-center w-full">
              
              {/* 실제 QR 코드 렌더러 */}
              <div className="bg-white p-6 rounded-[30px] shadow-md border border-gray-100 mb-6 transform transition-transform hover:scale-105 duration-300">
                <div className="flex items-center justify-center">
                  {generatedUrl ? (
                    <QRCodeSVG value={generatedUrl} size={160} level={"H"} includeMargin={true} />
                  ) : (
                    <div className="w-[160px] h-[160px] bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-sans">QR 준비중...</div>
                  )}
                </div>
              </div>

              <div className="w-full bg-violet-50 p-4 rounded-[20px] border border-violet-100 mb-6 flex items-center shadow-inner overflow-hidden">
                <span className="text-2xl mr-3 shrink-0">🔗</span>
                <span className="text-violet-600 font-sans font-bold text-sm truncate flex-1">{generatedUrl}</span>
              </div>

              <div className="flex w-full gap-3">
                <button 
                  onClick={copyLink}
                  className="flex-1 flex flex-col items-center justify-center bg-sky-50 text-sky-600 transition-all duration-300 active:scale-95 space-y-2 py-5 rounded-[24px] border border-sky-200 hover:bg-sky-100 shadow-sm"
                >
                  <span className="text-3xl">📋</span>
                  <span className="text-[15px] font-sans font-bold">링크 복사</span>
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
