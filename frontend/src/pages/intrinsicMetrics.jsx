import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
// import './style.scss';

const getMetricTag = (name, value, isLoading) => {
  if (value === "") return "";
  if (isLoading) {
    value = "";
  }
  else if (!isNaN(value)) {
    value = parseFloat(value).toFixed(2);
  }
  return (
  <div className="control">
    <div className="tags has-addons">
      <span className="tag is-dark is-large">{name}</span>
      <span className={`tag is-info is-large ${isLoading ? "is-loading" : 0}`}>{value}</span>
    </div>
  </div>
  )
}

const IntrinsicMetrics = () => {
  const [originalText, setOriginalText] = useState("")
  const [generatedText, setGeneratedText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [bertScore, setBertScore] = useState("")
  const [bleuScore, setBleuScore] = useState("")
  const [styleSimilarity, setStyleSimilarity] = useState("")
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io('http://localhost:4999'); // Replace with your Flask server's URL
    setSocket(newSocket);

    // Handle incoming messages
    newSocket.on('calculated_bert', (data) => {
      setBertScore(data);}
    );

    newSocket.on('calculated_bleu', (data) => {
      setBleuScore(data);}
    );

    newSocket.on('calculated_style', (data) => {
      setStyleSimilarity(data);}
    );

    newSocket.on('analysis_complete', () => {
      setIsAnalyzing(false);
    })

    return () => newSocket.disconnect();
  }, []);

  const analyze = () => {
    if (!socket) return;
    setBertScore("calculating...");
    setBleuScore("calculating...");
    setStyleSimilarity("calculating...");
    setIsAnalyzing(true);
    socket.emit('analyze', {originalText, generatedText});
  }

  const handleOriginalTextChange = (event) => {
    setOriginalText(event.target.value);
  }

  const handleGeneratedTextChange = (event) => {
    setGeneratedText(event.target.value);
  }

  return (
    <>
      <h1 className='title'>NLP Demo</h1>
      <section className='section'>
        <div className="fixed-grid has-2-cols">
          <div className='grid'>
            <div className='cell'>
              <h2 className='subtitle'>Original Text</h2>
            </div>
            <div className='cell'>
              <h2 className='subtitle'>Generated Text</h2>
            </div>
            <div className='cell'>
              <textarea 
                className='textarea' 
                rows='20' 
                spellCheck="false"
                placeholder='Enter text here....' 
                value={originalText} 
                onChange={handleOriginalTextChange}></textarea>
            </div>
            <div className='cell'>
              <textarea 
                className='textarea'
                rows='20' 
                spellCheck="false"
                placeholder='Enter text here....' 
                value={generatedText} 
                onChange={handleGeneratedTextChange}></textarea>  
            </div>
            <div className='cell is-col-span-2'>
              
              <div className="field is-grouped is-grouped-multiline">
                <button className={`button is-primary ${isAnalyzing ? "is-loading" : ""}`} onClick={analyze}>Analyze</button>
                {
                  getMetricTag("BERT Score", bertScore, bertScore === "calculating..." ? true : false)
                }
                {
                  getMetricTag("Bleu Score", bleuScore, bleuScore === "calculating..." ? true : false)
                }
                {
                  getMetricTag("Style Similarity\n(Part of speech tags)", styleSimilarity, styleSimilarity === "calculating..." ? true : false)
                }
              </div>
            </div>
          </div>
        </div>
      </section>
    </> 
  )
}

export default IntrinsicMetrics
