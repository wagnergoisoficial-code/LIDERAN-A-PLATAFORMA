import React, { useState } from 'react';
import { api } from '../services/api';
import UIkit from 'uikit';

interface ChurchCreateProps {
  onChurchCreated?: () => void;
}

const ChurchCreate: React.FC<ChurchCreateProps> = ({ onChurchCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    cultosDias: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [cultoDias] = useState(['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDiaChange = (dia: string) => {
    setFormData(prev => ({
      ...prev,
      cultosDias: prev.cultosDias.includes(dia)
        ? prev.cultosDias.filter(d => d !== dia)
        : [...prev.cultosDias, dia]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      UIkit.notification({ message: 'Nome da comunidade é obrigatório', status: 'danger', pos: 'top-right' });
      return;
    }

    setLoading(true);

    try {
      const response = await api.createChurch({
        name: formData.name,
        title: formData.title || null,
        description: formData.description || null,
        cultosDias: formData.cultosDias.length > 0 ? formData.cultosDias : null,
      });

      if (response.success) {
        UIkit.notification({ 
          message: 'Comunidade criada com sucesso!', 
          status: 'success', 
          pos: 'top-right' 
        });
        setFormData({
          name: '',
          title: '',
          description: '',
          cultosDias: [],
        });
        if (onChurchCreated) {
          onChurchCreated();
        }
      }
    } catch (err: any) {
      UIkit.notification({ 
        message: err.message || 'Erro ao criar comunidade', 
        status: 'danger', 
        pos: 'top-right' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uk-card uk-card-default uk-card-body uk-box-shadow-medium uk-margin-bottom" style={{ maxWidth: '800px', margin: '0 auto 20px' }}>
      <h3 className="uk-card-title">Criar Nova Comunidade</h3>
      
      <form onSubmit={handleSubmit} className="uk-form-stacked">
        <div className="uk-margin">
          <label className="uk-form-label uk-text-bold">Nome da Comunidade *</label>
          <input 
            className="uk-input" 
            type="text" 
            name="name"
            placeholder="Ex: Igreja Central"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="uk-margin">
          <label className="uk-form-label uk-text-bold">Nome da Igreja</label>
          <input 
            className="uk-input" 
            type="text" 
            name="title"
            placeholder="Ex: Igreja Pentecostal do Brasil"
            value={formData.title}
            onChange={handleInputChange}
          />
        </div>

        <div className="uk-margin">
          <label className="uk-form-label uk-text-bold">Descrição</label>
          <textarea 
            className="uk-textarea" 
            name="description"
            placeholder="Descreva a comunidade, missão, visão..."
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
          ></textarea>
        </div>

        <div className="uk-margin">
          <label className="uk-form-label uk-text-bold">Dias de Culto</label>
          <div className="uk-grid-small uk-child-width-auto" uk-grid="">
            {cultoDias.map(dia => (
              <label key={dia}>
                <input 
                  className="uk-checkbox" 
                  type="checkbox" 
                  checked={formData.cultosDias.includes(dia)}
                  onChange={() => handleDiaChange(dia)}
                />
                <span className="uk-margin-small-left uk-text-capitalize">{dia}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="uk-margin uk-text-right">
          <button 
            className="uk-button uk-button-primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? <span uk-spinner="ratio: 0.6"></span> : '✓ Criar Comunidade'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChurchCreate;
