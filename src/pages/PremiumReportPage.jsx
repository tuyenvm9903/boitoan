import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Moon, Download, RotateCcw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { WizardContainer } from '../components/wizard';
import TuViChart from '../components/charts/TuViChart';
import BirthdayChart from '../components/charts/BirthdayChart';
import NumerologyPyramid from '../components/charts/NumerologyPyramid';
import LoadingOracle from '../components/animations/LoadingOracle';
import { calculateTuViChart } from '../utils/tuViCalculator';
import { fullNumerologyAnalysis } from '../utils/numerology';
import { calculateBirthdayChart, calculatePinnaclePyramid, calculateLifeCycles } from '../utils/numerologyAdvanced';
import { crossReferenceAnalysis } from '../utils/crossAnalysis';
import { generatePDF } from '../services/pdfGenerator';
import { getBirthHourFromTime, TIME_PERIODS } from '../utils/birthHourMapping';
import { getChatModel, getOpenAIClient, getOpenAIErrorMessage } from '../utils/aiClient';

export default function PremiumReportPage() {
  const [stage, setStage] = useState('wizard'); // 'wizard', 'loading', 'reveal', 'dashboard'
  const [formData, setFormData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Analysis Results
  const [tuViData, setTuViData] = useState(null);
  const [numerologyData, setNumerologyData] = useState(null);
  const [birthdayChart, setBirthdayChart] = useState(null);
  const [pyramidData, setPyramidData] = useState(null);
  const [crossAnalysis, setCrossAnalysis] = useState(null);
  const [aiReport, setAiReport] = useState('');

  // UI State
  const [expandedSections, setExpandedSections] = useState({
    tuVi: true,
    numerology: true,
    cross: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  const handleWizardComplete = async (data) => {
    setFormData(data);
    setStage('loading');
    await performAnalysis(data);
  };

  const performAnalysis = async (data) => {
    try {
      // Step 1: Calculate birth hour
      setLoadingProgress(10);
      let birthHour = 12; // Default noon
      if (data.birthTimeType === 'exact' && data.birthHour) {
        birthHour = parseInt(data.birthHour);
      } else if (data.birthTimeType === 'period' && data.birthPeriod) {
        const period = TIME_PERIODS.find(p => p.id === data.birthPeriod);
        if (period) birthHour = period.defaultHour;
      }

      // Step 2: Tu Vi Analysis
      setLoadingProgress(25);
      const tuVi = calculateTuViChart(
        parseInt(data.birthYear),
        parseInt(data.birthMonth),
        parseInt(data.birthDay),
        birthHour,
        data.gender
      );
      setTuViData(tuVi);

      // Step 3: Numerology Analysis
      setLoadingProgress(40);
      const numerology = fullNumerologyAnalysis(
        data.fullName,
        parseInt(data.birthDay),
        parseInt(data.birthMonth),
        parseInt(data.birthYear),
        'pythagorean'
      );
      setNumerologyData(numerology);

      // Step 4: Birthday Chart
      setLoadingProgress(50);
      const bdChart = calculateBirthdayChart(
        parseInt(data.birthDay),
        parseInt(data.birthMonth),
        parseInt(data.birthYear)
      );
      setBirthdayChart(bdChart);

      // Step 5: Pinnacle Pyramid
      setLoadingProgress(60);
      const pyramid = calculatePinnaclePyramid(
        parseInt(data.birthDay),
        parseInt(data.birthMonth),
        parseInt(data.birthYear)
      );
      setPyramidData(pyramid);

      // Step 6: Cross Analysis
      setLoadingProgress(70);
      const cross = crossReferenceAnalysis(tuVi, numerology);
      setCrossAnalysis(cross);

      // Step 7: AI Report
      setLoadingProgress(80);
      await generateAIReport(data, tuVi, numerology, cross);

      setLoadingProgress(100);

      // Show reveal animation
      setTimeout(() => setStage('reveal'), 500);

      // Then show dashboard
      setTimeout(() => setStage('dashboard'), 3000);

    } catch (error) {
      console.error('Analysis error:', error);
      setStage('dashboard');
    }
  };

  const generateAIReport = async (data, tuVi, numerology, cross) => {
    try {
      const openai = getOpenAIClient();
      if (!openai) {
        setAiReport('Thiếu cấu hình VITE_OPENAI_TOKEN. Vui lòng thêm API token để tạo báo cáo AI.');
        return;
      }

      const response = await openai.chat.completions.create({
        model: getChatModel(),
        messages: [
          {
            role: 'system',
            content: `Bạn là Đại Sư Huyền Không - chuyên gia hàng đầu về Tử Vi Đẩu Số, Thần Số Học.
Phong cách: Uyên bác nhưng gần gũi, tránh mê tín, tập trung phát triển bản thân.
Sử dụng ẩn dụ văn hóa Á Đông. Format Markdown.`
          },
          {
            role: 'user',
            content: `Phân tích TỔNG HỢP cho:

**THÔNG TIN:**
- Họ tên: ${data.fullName}
- Giới tính: ${data.gender === 'male' ? 'Nam' : data.gender === 'female' ? 'Nữ' : 'Khác'}
- Ngày sinh: ${data.birthDay}/${data.birthMonth}/${data.birthYear}

**TỬ VI:**
- Mệnh cung: ${tuVi?.menhChi || 'N/A'}
- Sao chính: ${tuVi?.menhMainStar?.name || 'Không có'}
- Cục: ${tuVi?.cuc?.name || 'N/A'}
- Năm: ${tuVi?.lunarDate?.yearGanZhi || 'N/A'}

**THẦN SỐ HỌC:**
- Số Chủ Đạo: ${numerology?.lifePath || 'N/A'}
- Số Biểu Đạt: ${numerology?.expression || 'N/A'}
- Số Linh Hồn: ${numerology?.soulUrge || 'N/A'}
- Số Nhân Cách: ${numerology?.personality || 'N/A'}

**PHÂN TÍCH TƯƠNG QUAN:**
- Điểm hài hòa: ${cross?.overallScore || 'N/A'}%
- Nhận định: ${cross?.summary || 'N/A'}

Tạo báo cáo ngắn gọn (500 từ) với:
## TỔNG QUAN VẬN MỆNH
## ĐIỂM NỔI BẬT
## DỰ BÁO GIAI ĐOẠN TỚI
## LỜI KHUYÊN`
          }
        ],
        max_tokens: 1500
      });

      setAiReport(response.choices[0].message.content);
    } catch (error) {
      console.error('AI Report error:', error);
      setAiReport(`Không thể tạo báo cáo AI: ${getOpenAIErrorMessage(error)}`);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const filename = `ban-do-van-menh-${formData.fullName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      await generatePDF(reportRef.current, filename);
    } catch (error) {
      console.error('PDF error:', error);
    }
    setIsExporting(false);
  };

  const handleReset = () => {
    setStage('wizard');
    setFormData(null);
    setTuViData(null);
    setNumerologyData(null);
    setBirthdayChart(null);
    setPyramidData(null);
    setCrossAnalysis(null);
    setAiReport('');
    setLoadingProgress(0);
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-display text-[var(--color-gold)] mt-4 mb-2">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-base font-display text-[var(--color-jade)] mt-3 mb-1">{line.replace('### ', '')}</h3>;
      if (line.startsWith('- ')) return <li key={i} className="text-[var(--color-pearl)] ml-4 text-sm">{line.replace('- ', '')}</li>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-[var(--color-pearl)] text-sm leading-relaxed mb-2">{line}</p>;
    });
  };

  // Render based on stage
  if (stage === 'loading') {
    return <LoadingOracle progress={loadingProgress} />;
  }

  if (stage === 'reveal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-obsidian)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-6xl mb-6"
          >
            {tuViData?.lunarDate?.yearGanZhi?.includes('Ngọ') ? '🐴' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Tý') ? '🐀' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Sửu') ? '🐂' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Dần') ? '🐅' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Mão') ? '🐇' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Thìn') ? '🐉' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Tỵ') ? '🐍' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Mùi') ? '🐐' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Thân') ? '🐒' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Dậu') ? '🐓' :
             tuViData?.lunarDate?.yearGanZhi?.includes('Tuất') ? '🐕' : '🐖'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-3xl text-[var(--color-gold)] mb-2"
          >
            {formData?.fullName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-[var(--color-jade)] text-lg"
          >
            {tuViData?.lunarDate?.yearGanZhi}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-[var(--color-mist)] mt-4"
          >
            ⭐ Vận mệnh đã hiển lộ ⭐
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (stage === 'wizard') {
    return (
      <div className="min-h-screen bg-mystical pt-24 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/30 mb-4">
              <Sparkles size={28} className="text-[var(--color-gold)]" />
            </div>
            <h1 className="font-display text-4xl text-[var(--color-ivory)] mb-2">
              Bản Đồ Vận Mệnh
            </h1>
            <p className="text-[var(--color-mist)]">
              Khám phá vận mệnh qua Tử Vi & Thần Số Học
            </p>
          </div>

          <WizardContainer onComplete={handleWizardComplete} />
        </motion.div>
      </div>
    );
  }

  // Dashboard Stage
  return (
    <div className="min-h-screen bg-mystical pt-24 pb-16 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star size={20} className="text-[var(--color-gold)]" />
            <span className="text-5xl">
              {tuViData?.lunarDate?.yearGanZhi?.includes('Ngọ') ? '🐴' : '🐉'}
            </span>
            <Star size={20} className="text-[var(--color-gold)]" />
          </div>
          <h1 className="font-display text-3xl text-[var(--color-gold)] mb-1">
            {formData?.fullName}
          </h1>
          <p className="text-[var(--color-jade)]">
            {tuViData?.lunarDate?.yearGanZhi} • {tuViData?.cuc?.name}
          </p>
        </div>

        {/* Score Card */}
        {crossAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-mystical rounded-2xl p-6 mb-6 text-center"
          >
            <h2 className="text-sm text-[var(--color-mist)] mb-2">Điểm Hài Hòa Tổng Thể</h2>
            <div className="text-5xl font-display mb-2" style={{ color: crossAnalysis.scoreLevel.color }}>
              {crossAnalysis.overallScore}%
            </div>
            <span className="px-3 py-1 rounded-full text-sm" style={{
              backgroundColor: `${crossAnalysis.scoreLevel.color}20`,
              color: crossAnalysis.scoreLevel.color
            }}>
              {crossAnalysis.scoreLevel.label}
            </span>
            <p className="text-sm text-[var(--color-pearl)] mt-4 max-w-xl mx-auto">
              {crossAnalysis.summary}
            </p>
          </motion.div>
        )}

        {/* Main Content */}
        <div ref={reportRef} className="space-y-6">
          {/* Tu Vi Section */}
          <CollapsibleSection
            title="Lá Số Tử Vi"
            icon="🌟"
            isExpanded={expandedSections.tuVi}
            onToggle={() => toggleSection('tuVi')}
          >
            {tuViData && (
              <div className="grid md:grid-cols-2 gap-6">
                <TuViChart chartData={tuViData} />
                <div className="space-y-4">
                  <InfoCard title="Thông Tin Lá Số">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[var(--color-mist)]">Mệnh:</span>
                        <span className="ml-2 text-[var(--color-gold)]">{tuViData.menhChi}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-mist)]">Thân:</span>
                        <span className="ml-2 text-[var(--color-jade)]">{tuViData.thanChi}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-mist)]">Cục:</span>
                        <span className="ml-2 text-[var(--color-ivory)]">{tuViData.cuc?.name}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-mist)]">Sao chính:</span>
                        <span className="ml-2 text-[var(--color-gold)]">{tuViData.menhMainStar?.name || 'Không có'}</span>
                      </div>
                    </div>
                  </InfoCard>
                  {tuViData.currentDaiVan && (
                    <InfoCard title="Đại Vận Hiện Tại">
                      <p className="text-[var(--color-gold)]">{tuViData.currentDaiVan.cung}</p>
                      <p className="text-sm text-[var(--color-mist)]">{tuViData.currentDaiVan.period}</p>
                    </InfoCard>
                  )}
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* Numerology Section */}
          <CollapsibleSection
            title="Thần Số Học"
            icon="🔢"
            isExpanded={expandedSections.numerology}
            onToggle={() => toggleSection('numerology')}
          >
            <div className="grid md:grid-cols-2 gap-6">
              {/* Core Numbers */}
              <div className="space-y-4">
                <InfoCard title="4 Số Cốt Lõi">
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      { label: 'Chủ Đạo', value: numerologyData?.lifePath },
                      { label: 'Biểu Đạt', value: numerologyData?.expression },
                      { label: 'Linh Hồn', value: numerologyData?.soulUrge },
                      { label: 'Nhân Cách', value: numerologyData?.personality }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="text-2xl font-display text-[var(--color-gold)]">{item.value}</div>
                        <div className="text-[10px] text-[var(--color-mist)]">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </InfoCard>

                {birthdayChart && <BirthdayChart chartData={birthdayChart} />}
              </div>

              {/* Pyramid */}
              <div>
                {pyramidData && (
                  <NumerologyPyramid
                    pyramidData={pyramidData}
                    currentAge={tuViData?.currentAge || 0}
                  />
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* AI Analysis */}
          <CollapsibleSection
            title="Phân Tích AI"
            icon="🤖"
            isExpanded={expandedSections.cross}
            onToggle={() => toggleSection('cross')}
          >
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(aiReport)}
            </div>
          </CollapsibleSection>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <motion.button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-jade)] text-white"
            whileHover={{ scale: 1.05 }}
          >
            <Download size={18} />
            {isExporting ? 'Đang xuất...' : 'Tải PDF'}
          </motion.button>
          <motion.button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--color-gold)]/30 text-[var(--color-gold)]"
            whileHover={{ scale: 1.05 }}
          >
            <RotateCcw size={18} />
            Phân tích mới
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({ title, icon, isExpanded, onToggle, children }) {
  return (
    <motion.div className="card-mystical rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-smoke)]/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h2 className="font-display text-xl text-[var(--color-ivory)]">{title}</h2>
        </div>
        {isExpanded ? <ChevronUp size={20} className="text-[var(--color-gold)]" /> : <ChevronDown size={20} className="text-[var(--color-mist)]" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Info Card Component
function InfoCard({ title, children }) {
  return (
    <div className="bg-[var(--color-smoke)]/20 rounded-xl p-4 border border-[var(--color-gold)]/10">
      <h4 className="text-sm font-display text-[var(--color-gold)] mb-3">{title}</h4>
      {children}
    </div>
  );
}
