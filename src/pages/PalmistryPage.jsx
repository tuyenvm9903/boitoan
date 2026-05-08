import { useState } from 'react';
import { motion } from 'framer-motion';
import { Hand, Upload, Sparkles, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { getOpenAIClient, getOpenAIErrorMessage, getVisionModel } from '../utils/aiClient';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MIN_ANALYSIS_CHARACTERS = 2600;
const FOLLOWUP_SECTION_REGEX = /\n*#{0,3}\s*Nếu muốn xem tiếp[\s\S]*$/i;

const stripFollowupSection = (text) => text.replace(FOLLOWUP_SECTION_REGEX, '').trim();

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function PalmistryPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setErrorMessage('');
    setResult('');

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn file ảnh hợp lệ (jpg, png, webp).');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage('Ảnh vượt quá 8MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult('');
    setErrorMessage('');
  };

  const analyzePalm = async () => {
    if (!selectedFile || isAnalyzing) return;

    const openai = getOpenAIClient();
    if (!openai) {
      setErrorMessage('Thiếu cấu hình VITE_OPENAI_TOKEN. Vui lòng thêm API token để phân tích ảnh.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage('');
      setResult('');

      const imageDataUrl = await fileToDataUrl(selectedFile);

      const response = await openai.chat.completions.create({
        model: getVisionModel(),
        messages: [
          {
            role: 'system',
            content: `Bạn là chuyên gia Chỉ Tay Học Á Đông và là cố vấn phát triển cá nhân.
Mục tiêu: đọc ảnh lòng bàn tay và trả lời theo văn phong rõ ràng, thực tế, có chiều sâu như chuyên gia.
Nguyên tắc:
- Luôn viết tiếng Việt dễ hiểu, tránh mơ hồ.
- Đưa nhận định theo mức độ chắc chắn: "Dễ có xu hướng...", "Có khả năng...", không tuyệt đối hóa.
- Nếu ảnh mờ/thiếu góc/khó nhìn đường tay, phải nêu rõ giới hạn trước khi phân tích.
- Nội dung chỉ mang tính tham khảo phát triển bản thân, không phải kết luận y khoa/tài chính/pháp lý.
- Trình bày bằng Markdown, ưu tiên gạch đầu dòng ngắn gọn, có trọng tâm.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Phân tích ảnh bàn tay theo đúng bố cục dưới đây. Viết đủ ý, cụ thể, dễ đọc:

## Tính cách nổi bật
- 4-6 ý, đi thẳng vào đặc điểm tâm lý nổi bật.
- Nêu cả điểm mạnh và mặt dễ "tự làm khó mình".

## Đường tình cảm
- Đọc đường tâm đạo (độ cong, độ đậm, độ đều, nhánh/cắt nếu có).
- Suy ra phong cách yêu, mẫu người phù hợp, điểm cần lưu ý khi yêu.
- Nếu phù hợp, thêm 1 đoạn ngắn: "Tình duyên thường..." (không khẳng định tuyệt đối).

## Công việc - tiền bạc
- Đọc đường vận mệnh/sự nghiệp nếu thấy rõ.
- Nêu xu hướng theo giai đoạn tuổi (ví dụ đầu 20s, sau 26-28...) nếu có cơ sở.
- Gợi ý 5-7 nhóm nghề phù hợp thiên hướng.
- Chỉ ra thói quen dễ gây áp lực tinh thần và cách cân bằng.

## Tổng quan
- 3-5 ý kết luận súc tích về khí chất, hướng phát triển, và điều nên ưu tiên.

Yêu cầu chất lượng:
- Văn phong chắc, rõ, "đọc phát hiểu ngay", không lan man.
- Không dùng câu quá chung chung kiểu ai cũng đúng.
- Nếu dữ liệu ảnh không đủ, nói rõ phần nào chưa chắc chắn.
- Độ dài mục tiêu: 450-900 từ.`
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUrl }
              }
            ]
          }
        ],
        max_tokens: 2200
      });

      let content = response?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Phản hồi AI không có nội dung.');
      }

      if (content.length < MIN_ANALYSIS_CHARACTERS) {
        const expanded = await openai.chat.completions.create({
          model: getVisionModel(),
          messages: [
            {
              role: 'system',
              content:
                'Bạn là biên tập viên chỉ tay học cao cấp. Nhiệm vụ: mở rộng bản phân tích thành bản đầy đủ, rõ ràng, có chiều sâu, tránh lặp câu.'
            },
            {
              role: 'user',
              content: `Bản phân tích hiện tại đang quá ngắn. Hãy viết lại và mở rộng theo đúng bố cục sau, giữ văn phong chắc gọn:
## Tính cách nổi bật
## Đường tình cảm
## Công việc - tiền bạc
## Tổng quan

Yêu cầu:
- Dài hơn bản cũ, mục tiêu 700-1200 từ.
- Mỗi mục có luận điểm cụ thể, ví dụ dễ hiểu.
- Không dùng câu chung chung kiểu "ai cũng đúng".
- Giữ mức độ chắc chắn hợp lý (dễ có xu hướng/có khả năng), không khẳng định tuyệt đối.

Đây là bản cũ cần mở rộng:
${content}`
            }
          ],
          max_tokens: 2600
        });

        const expandedContent = expanded?.choices?.[0]?.message?.content?.trim();
        if (expandedContent) {
          content = expandedContent;
        }
      }

      setResult(stripFollowupSection(content));
    } catch (error) {
      setErrorMessage(getOpenAIErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderMarkdown = (text) =>
    text.split('\n').map((line, idx) => {
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="font-display text-xl text-[var(--color-gold)] mt-6 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="font-display text-lg text-[var(--color-ivory)] mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="text-[var(--color-pearl)] ml-4 mb-1">
            {line.replace('- ', '')}
          </li>
        );
      }
      if (!line.trim()) return <br key={idx} />;
      return (
        <p key={idx} className="text-[var(--color-pearl)] leading-relaxed mb-2">
          {line}
        </p>
      );
    });

  return (
    <div className="min-h-screen bg-mystical pt-24 pb-16 px-4">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/30 mb-6">
            <Hand size={32} className="text-[var(--color-gold)]" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-[var(--color-ivory)] mb-4">Tướng Số Bàn Tay</h1>
          <p className="text-[var(--color-mist)] max-w-xl mx-auto">
            Upload ảnh lòng bàn tay để AI phân tích các đường chỉ tay chính.
          </p>
        </div>

        <div className="card-mystical rounded-2xl p-6 md:p-8">
          <div className="space-y-5">
            <label className="block">
              <span className="text-[var(--color-pearl)] mb-2 block">Ảnh bàn tay (jpg/png/webp, tối đa 8MB)</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="palm-upload" />
              <div className="flex gap-3">
                <label
                  htmlFor="palm-upload"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 cursor-pointer transition-colors"
                >
                  <Upload size={18} />
                  Chọn ảnh bàn tay
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--color-smoke)] text-[var(--color-mist)] hover:text-[var(--color-ivory)]"
                  >
                    <X size={18} />
                    Xóa ảnh
                  </button>
                )}
              </div>
            </label>

            {previewUrl && (
              <div className="rounded-xl overflow-hidden border border-[var(--color-gold)]/20 bg-[var(--color-charcoal)]">
                <img src={previewUrl} alt="Palm preview" className="w-full max-h-[420px] object-contain" />
              </div>
            )}

            {!previewUrl && (
              <div className="rounded-xl border border-dashed border-[var(--color-smoke)] p-10 text-center">
                <ImageIcon size={28} className="mx-auto text-[var(--color-mist)] mb-3" />
                <p className="text-[var(--color-mist)]">Chưa có ảnh nào được chọn</p>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-[var(--color-fire)]/40 bg-[var(--color-fire)]/10 p-3 text-[var(--color-pearl)]">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={analyzePalm}
              disabled={!selectedFile || isAnalyzing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-dim)] text-[var(--color-obsidian)] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang phân tích ảnh...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Phân tích chỉ tay bằng AI
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <motion.div
            className="card-mystical rounded-2xl p-6 md:p-8 mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-display text-2xl text-[var(--color-gold)] mb-4">Kết quả phân tích</h2>
            <div>{renderMarkdown(result)}</div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
