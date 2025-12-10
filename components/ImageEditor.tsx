import React, { useState, useRef } from 'react';
import { editImageWithGemini } from '../services/geminiService';

interface ImageEditorProps {
  onBack: () => void;
  contextGoal: string;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ onBack, contextGoal }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setGeneratedImage(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile || !prompt) {
      alert("Please upload an image and enter a prompt.");
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1]; // Remove data url prefix
      const mimeType = selectedFile.type;

      // Augment prompt to enforce session context
      const augmentedPrompt = `You are a creative companion for a user who is focusing on: "${contextGoal}".
      The user wants to edit an image with this specific instruction: "${prompt}".
      
      CRITICAL INSTRUCTION:
      The generated image MUST incorporate elements, themes, or styles related to "${contextGoal}" while fulfilling the user's edit request.
      If the user's prompt is generic, heavily bias the style towards "${contextGoal}".
      `;

      try {
        const resultUrl = await editImageWithGemini(base64String, mimeType, augmentedPrompt);
        setGeneratedImage(resultUrl);
      } catch (error) {
        alert("Failed to edit image. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-4">
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-bold flex items-center gap-2 group transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
        </button>
        <span className="text-[10px] px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full font-bold uppercase tracking-wide border border-pink-200 dark:border-pink-800/30">
          Powered by Gemini 2.5 Flash
        </span>
      </div>

      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500">
          Creative Studio
        </h2>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
           <span>Inspired by session:</span>
           <span className="text-indigo-600 dark:text-indigo-400">"{contextGoal}"</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-800">
          
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all mb-6 relative overflow-hidden group
              ${previewUrl ? 'border-indigo-500 bg-slate-50 dark:bg-slate-950' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center p-4">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Click to upload image</p>
                <p className="text-xs text-slate-400 mt-1">PNG or JPEG</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg" 
              onChange={handleFileChange} 
            />
            {previewUrl && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <p className="text-white font-bold text-sm">Change Image</p>
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Instructions (Context locked to session)
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`e.g. Turn this into a sketch... (AI will relate it to "${contextGoal}")`}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:focus:border-pink-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm h-24 resize-none"
                />
             </div>
             
             <button
               onClick={handleGenerate}
               disabled={!selectedFile || !prompt || isGenerating}
               className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2
                 ${(!selectedFile || !prompt || isGenerating) 
                   ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500' 
                   : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 hover:scale-[1.02]'}`}
             >
               {isGenerating ? (
                 <>
                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Creating Magic...
                 </>
               ) : (
                 <>
                   <span>Generate Edit</span>
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
                 </>
               )}
             </button>
          </div>
        </div>

        {/* Right: Result */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col">
           <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Result</h3>
           
           <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center min-h-[300px] overflow-hidden relative">
             {generatedImage ? (
               <img src={generatedImage} alt="Generated" className="w-full h-full object-contain animate-fade-in" />
             ) : (
               <div className="text-center p-8 opacity-40">
                 {isGenerating ? (
                   <div className="animate-pulse">
                      <div className="w-16 h-16 bg-pink-400 rounded-full mx-auto mb-4 opacity-50"></div>
                      <p className="font-bold text-slate-900 dark:text-white">Processing pixels...</p>
                   </div>
                 ) : (
                   <>
                     <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-800 rounded-full mx-auto mb-4 border-dashed"></div>
                     <p className="text-sm font-bold text-slate-500 dark:text-slate-500">Your masterpiece will appear here</p>
                   </>
                 )}
               </div>
             )}
           </div>

           {generatedImage && (
             <a 
               href={generatedImage} 
               download="neurofocus-edit.png"
               className="mt-4 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
             >
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
               Download Image
             </a>
           )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;