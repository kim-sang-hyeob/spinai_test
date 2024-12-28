import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [memos, setMemos] = useState([]);
  const [currentMemo, setCurrentMemo] = useState({ 
    id: null, 
    content: '', 
    title: '',
    createdAt: null 
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]');
    setMemos(savedMemos);
  }, []);

  const generateTitle = async (content) => {
    if (content.length < 50) return content.slice(0, 50);

    // API 키 확인용 로그 (실제 배포 시에는 제거)
    console.log('API Key loaded:', process.env.REACT_APP_OPENAI_API_KEY ? 'Yes' : 'No');

    try {
      console.log('Sending request to OpenAI...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "주어진 메모의 내용을 한국어로 요약해서 제목으로 만들어주세요. 주요 내용을 포함하고, 25자 이내로 작성해주세요."
            },
            {
              role: "user",
              content: content
            }
          ],
          temperature: 0.5,
          max_tokens: 100,
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response format');
      }

      const title = data.choices[0].message.content.trim();
      console.log('Generated title:', title);
      return title;
    } catch (error) {
      console.error('Error details:', error);
      // API 키 관련 에러인 경우 더 명확한 메시지 표시
      if (error.message.includes('API key')) {
        alert('OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
      }
      const firstLine = content.split('\n')[0];
      return firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '');
    }
  };

  const saveMemo = async () => {
    if (!currentMemo.content.trim()) return;

    try {
      let title = currentMemo.content;
      if (currentMemo.content.length > 100) {
        console.log('Content length:', currentMemo.content.length);
        console.log('Generating title for:', currentMemo.content);
        title = await generateTitle(currentMemo.content);
      }

      let newMemos;
      if (currentMemo.id) {
        newMemos = memos.map(memo => 
          memo.id === currentMemo.id ? {
            ...currentMemo,
            title: title
          } : memo
        );
      } else {
        newMemos = [...memos, { 
          id: Date.now(), 
          content: currentMemo.content,
          title: title,
          createdAt: new Date().toISOString()
        }];
      }
      
      setMemos(newMemos);
      localStorage.setItem('memos', JSON.stringify(newMemos));
      setCurrentMemo({ id: null, content: '', title: '', createdAt: null });
    } catch (error) {
      console.error('Error in saveMemo:', error);
      alert('메모 저장 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
    }
  };

  const deleteMemo = (id) => {
    const newMemos = memos.filter(memo => memo.id !== id);
    setMemos(newMemos);
    localStorage.setItem('memos', JSON.stringify(newMemos));
  };

  const editMemo = (memo) => {
    setCurrentMemo(memo);
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('ko-KR', options);
  };

  const filteredMemos = memos.filter(memo =>
    memo.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="App">
      <div className="header">
        <img 
          src="/logo.svg" 
          alt="SPINAI_MEMO Logo" 
          className="logo" 
        />
        <h1>메모장</h1>
        <div className="search-box">
          <input
            type="text"
            placeholder="메모 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="memo-input">
        <textarea
          value={currentMemo.content}
          onChange={(e) => setCurrentMemo({
            ...currentMemo,
            content: e.target.value
          })}
          placeholder="메모를 입력하세요..."
        />
        <button className="save-button" onClick={saveMemo}>
          {currentMemo.id ? '수정하기' : '저장하기'}
        </button>
      </div>

      <div className="memo-list">
        {filteredMemos.map(memo => (
          <div key={memo.id} className="memo-item">
            <div className="memo-content">
              <h3 className="memo-title">{memo.title}</h3>
              <p>{memo.content}</p>
              <span className="memo-date">{formatDate(memo.createdAt)}</span>
            </div>
            <div className="memo-actions">
              <button className="edit-button" onClick={() => editMemo(memo)}>수정</button>
              <button className="delete-button" onClick={() => deleteMemo(memo.id)}>삭제</button>
            </div>
          </div>
        ))}
        {filteredMemos.length === 0 && (
          <div className="no-memos">
            {searchTerm ? '검색 결과가 없습니다.' : '메모가 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 
