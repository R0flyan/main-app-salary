import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler
import os
import re
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SalaryPredictor:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.model_path = "ml_models/salary_predictor.pkl"
        self.is_trained = False
        
    def extract_features(self, vacancies: List[Dict[str, Any]]) -> np.ndarray:
        """Извлечение признаков из вакансий"""
        texts = []
        
        for vac in vacancies:
            # Объединяем название и компанию для текстового анализа
            text = f"{vac.get('title', '')} {vac.get('company', '')}"
            # Приводим к нижнему регистру и удаляем лишние символы
            text = re.sub(r'[^\w\s]', ' ', text.lower())
            texts.append(text)
            
        return texts
    
    def train(self, vacancies: List[Dict[str, Any]]):
        """Обучение модели на имеющихся вакансиях"""
        if len(vacancies) < 5:
            logger.warning("Недостаточно данных для обучения модели (нужно минимум 5 вакансий)")
            return False
        
        # Извлекаем признаки
        texts = self.extract_features(vacancies)
        salaries = [v.get('salary', 0) for v in vacancies if v.get('salary', 0) > 0]
        
        if len(salaries) < 5:
            logger.warning("Недостаточно вакансий с указанной зарплатой")
            return False
        
        # Создаем пайплайн
        self.vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        self.model = LinearRegression()
        
        # Обучаем
        try:
            X = self.vectorizer.fit_transform(texts)
            self.model.fit(X, salaries)
            self.is_trained = True
            
            # Сохраняем модель
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            joblib.dump({
                'vectorizer': self.vectorizer,
                'model': self.model
            }, self.model_path)
            
            logger.info(f"Модель обучена на {len(vacancies)} вакансиях")
            return True
        except Exception as e:
            logger.error(f"Ошибка при обучении модели: {e}")
            return False
    
    def load_model(self):
        """Загрузка сохраненной модели"""
        try:
            if os.path.exists(self.model_path):
                data = joblib.load(self.model_path)
                self.vectorizer = data['vectorizer']
                self.model = data['model']
                self.is_trained = True
                logger.info("Модель загружена")
                return True
        except Exception as e:
            logger.error(f"Ошибка загрузки модели: {e}")
        return False
    
    def predict_salary(self, vacancy: Dict[str, Any]) -> Dict[str, Any]:
        """Предсказание зарплаты для одной вакансии"""
        if not self.is_trained:
            if not self.load_model():
                return {
                    'predicted': None,
                    'error': 'Модель не обучена'
                }
        
        try:
            text = self.extract_features([vacancy])[0]
            X = self.vectorizer.transform([text])
            predicted = self.model.predict(X)[0]
            
            # Округляем до тысяч
            predicted = round(predicted / 1000) * 1000
            
            # Получаем реальную зарплату, если есть
            actual = vacancy.get('salary')
            if vacancy.get('salaryTo'):
                actual = (actual + vacancy['salaryTo']) / 2
            
            return {
                'predicted': max(0, int(predicted)),
                'actual': actual,
                'difference': abs(predicted - actual) if actual else None,
                'accuracy': 1 - (abs(predicted - actual) / actual) if actual and actual > 0 else None
            }
        except Exception as e:
            logger.error(f"Ошибка предсказания: {e}")
            return {
                'predicted': None,
                'error': str(e)
            }
    
    def analyze_vacancies(self, vacancies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Анализ всех вакансий"""
        if len(vacancies) == 0:
            return {
                'error': 'Нет вакансий для анализа',
                'stats': None
            }
        
        # Обучаем модель на этих вакансиях
        self.train(vacancies)
        
        # Анализируем каждую вакансию
        analyzed = []
        total_predicted = 0
        total_actual = 0
        count_with_actual = 0
        
        for vac in vacancies:
            result = self.predict_salary(vac)
            analyzed.append({
                'title': vac.get('title'),
                'company': vac.get('company'),
                'actual_salary': vac.get('salary'),
                'actual_salary_to': vac.get('salaryTo'),
                'predicted_salary': result.get('predicted'),
                'accuracy': result.get('accuracy')
            })
            
            if result.get('predicted'):
                total_predicted += result['predicted']
            if vac.get('salary'):
                total_actual += vac['salary']
                count_with_actual += 1
        
        # Статистика
        stats = {
            'total_vacancies': len(vacancies),
            'avg_predicted': total_predicted / len(vacancies) if total_predicted > 0 else 0,
            'avg_actual': total_actual / count_with_actual if count_with_actual > 0 else 0,
            'salary_range': {
                'min': min([v.get('salary', 0) for v in vacancies if v.get('salary')]) if count_with_actual > 0 else 0,
                'max': max([v.get('salary', 0) for v in vacancies if v.get('salary')]) if count_with_actual > 0 else 0
            },
            'by_company': self._analyze_by_company(vacancies, analyzed)
        }
        
        return {
            'analyzed': analyzed,
            'stats': stats
        }
    
    def _analyze_by_company(self, vacancies: List[Dict[str, Any]], analyzed: List) -> Dict:
        """Анализ по компаниям"""
        companies = {}
        for i, vac in enumerate(vacancies):
            company = vac.get('company', 'Не указано')
            if company not in companies:
                companies[company] = {
                    'count': 0,
                    'total_salary': 0,
                    'total_predicted': 0,
                    'vacancies': []
                }
            companies[company]['count'] += 1
            companies[company]['total_salary'] += vac.get('salary', 0)
            if analyzed[i].get('predicted_salary'):
                companies[company]['total_predicted'] += analyzed[i]['predicted_salary']
            companies[company]['vacancies'].append(vac.get('title'))
        
        # Добавляем средние значения
        for company in companies:
            if companies[company]['count'] > 0:
                companies[company]['avg_salary'] = companies[company]['total_salary'] / companies[company]['count']
                companies[company]['avg_predicted'] = companies[company]['total_predicted'] / companies[company]['count']
        
        return companies

# Создаем глобальный экземпляр
predictor = SalaryPredictor()