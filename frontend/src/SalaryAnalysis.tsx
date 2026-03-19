/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';

interface AnalysisResult {
  analyzed: Array<{
    title: string;
    company: string;
    actual_salary: number;
    actual_salary_to: number | null;
    predicted_salary: number;
    accuracy: number;
  }>;
  stats: {
    total_vacancies: number;
    avg_predicted: number;
    avg_actual: number;
    salary_range: {
      min: number;
      max: number;
    };
    by_company: Record<string, {
      count: number;
      avg_salary: number;
      avg_predicted: number;
      vacancies: string[];
    }>;
  };
}

interface Props {
  vacancies: any[];
  onClose: () => void;
  API_URL: string;
}

const SalaryAnalysis: React.FC<Props> = ({ vacancies, onClose, API_URL }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAnalysis = async () => {
    if (vacancies.length === 0) {
      setError('Нет вакансий для анализа');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/analysis/analyze-salaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(vacancies),
      });

      if (!res.ok) {
        throw new Error('Ошибка анализа');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError('Не удалось выполнить анализ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (salary: number) => {
    if (!salary) return '—';
    return salary.toLocaleString() + ' ₽';
  };

  const formatPercent = (value: number) => {
    if (!value) return '—';
    return (value * 100).toFixed(1) + '%';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#222',
        padding: '30px',
        borderRadius: '15px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '2px solid #4CAF50',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>
          Анализ зарплат (ML)
        </h2>

        {!analysis && !loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#fff', marginBottom: '20px' }}>
              Будет выполнено машинное обучение на основе {vacancies.length} вакансий
            </p>
            <button
              onClick={runAnalysis}
              style={{
                padding: '15px 30px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Запустить анализ
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #4CAF50',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: '#fff' }}>Анализ вакансий...</p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '15px',
            background: '#ff4444',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        {analysis && (
          <div>
            {/* Статистика */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '30px',
            }}>
              <div style={{
                background: '#333',
                padding: '15px',
                borderRadius: '8px',
              }}>
                <div style={{ color: '#aaa', fontSize: '14px' }}>Всего вакансий</div>
                <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold' }}>
                  {analysis.stats.total_vacancies}
                </div>
              </div>

              <div style={{
                background: '#333',
                padding: '15px',
                borderRadius: '8px',
              }}>
                <div style={{ color: '#aaa', fontSize: '14px' }}>Средняя реальная</div>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                  {formatSalary(analysis.stats.avg_actual)}
                </div>
              </div>

              <div style={{
                background: '#333',
                padding: '15px',
                borderRadius: '8px',
              }}>
                <div style={{ color: '#aaa', fontSize: '14px' }}>Средняя прогнозируемая</div>
                <div style={{ color: '#2196F3', fontSize: '20px', fontWeight: 'bold' }}>
                  {formatSalary(analysis.stats.avg_predicted)}
                </div>
              </div>

              <div style={{
                background: '#333',
                padding: '15px',
                borderRadius: '8px',
              }}>
                <div style={{ color: '#aaa', fontSize: '14px' }}>Диапазон</div>
                <div style={{ color: '#fff', fontSize: '16px' }}>
                  {formatSalary(analysis.stats.salary_range.min)} - {formatSalary(analysis.stats.salary_range.max)}
                </div>
              </div>
            </div>

            {/* Анализ по компаниям */}
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>По компаниям</h3>
            <div style={{ marginBottom: '30px' }}>
              {Object.entries(analysis.stats.by_company).map(([company, data]) => (
                <div key={company} style={{
                  background: '#333',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{company}</span>
                    <span style={{ color: '#aaa' }}>Вакансий: {data.count}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ color: '#aaa', fontSize: '12px' }}>Средняя реальная</div>
                      <div style={{ color: '#fff' }}>{formatSalary(data.avg_salary)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#aaa', fontSize: '12px' }}>Средняя прогноз</div>
                      <div style={{ color: '#2196F3' }}>{formatSalary(data.avg_predicted)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Детальный анализ */}
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Детальный анализ</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {analysis.analyzed.map((item, index) => (
                <div key={index} style={{
                  background: '#333',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '5px' }}>
                    {item.title}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '10px' }}>
                    {item.company}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: '#aaa' }}>Реальная: </span>
                      <span style={{ color: '#4CAF50' }}>
                        {formatSalary(item.actual_salary)}
                        {item.actual_salary_to && ` - ${formatSalary(item.actual_salary_to)}`}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#aaa' }}>Прогноз: </span>
                      <span style={{ color: '#2196F3' }}>
                        {formatSalary(item.predicted_salary)}
                      </span>
                    </div>
                    {item.accuracy && (
                      <div>
                        <span style={{ color: '#aaa' }}>Точность: </span>
                        <span style={{
                          color: item.accuracy > 0.8 ? '#4CAF50' : 
                                 item.accuracy > 0.6 ? '#FFA500' : '#FF4444'
                        }}>
                          {formatPercent(item.accuracy)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default SalaryAnalysis;