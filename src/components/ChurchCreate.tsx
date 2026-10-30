import React, { useState } from 'react';
import { api } from '../services/api';
import UIkit from 'uikit';

interface ChurchCreateProps {
  onChurchCreated?: () => void;
}

const ChurchCreate: React.FC<ChurchCreateProps> = ({ onChurchCreated }) => {
  const [formData, setFormData] = useState({
    name: '', title: '', description: '', cultosDias: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const cultoDias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDiaChange = (dia: string) => {
    setFormData(prev => ({
      ...prev,
      cultosDias: prev.cultosDias.includes(dia)
        ? prev.cultosDias.filter(d => d !== dia)
        : [...prev.cultosDias, dia],
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
        UIkit.notification({ message: 'Comunidade criada com sucesso!', status: 'success', pos: 'top-right' });
        setFormData({ name: '', title: '', description: '', cultosDias: [] });
        onChurchCreated?.();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao criar comunidade', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Nova Comunidade
        </span>
      </div>

      <div style={{ padding: '20px' }}>
        <form onSubmit={handleSubmit} className="uk-form-stacked">
          <div className="uk-margin">
            <label className="uk-form-label">Nome da Comunidade *</label>
            <input className="uk-input" type="text" name="name" placeholder="Ex: Jovens Central" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Nome da Igreja</label>
            <input className="uk-input" type="text" name="title" placeholder="Ex: Igreja Pentecostal do Brasil" value={formData.title} onChange={handleInputChange} />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Descrição</label>
            <textarea className="uk-textarea" name="description" placeholder="Descreva a comunidade, missão, visão..." rows={3} value={formData.description} onChange={handleInputChange}></textarea>
          </div>

          <div className="uk-margin">
            <label className="uk-form-label">Dias de Culto</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {cultoDias.map(dia => {
                const active = formData.cultosDias.includes(dia);
                return (
                  <label
                    key={dia}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 12px',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
                      background: active ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px', fontWeight: 500,
                      color: active ? 'var(--accent-dark)' : 'var(--text-muted)',
                      transition: 'all 160ms ease',
                      textTransform: 'capitalize'
                    }}
                  >
                    <input
                      type="checkbox"
                      className="uk-checkbox"
                      checked={active}
                      onChange={() => handleDiaChange(dia)}
                      style={{ display: 'none' }}
                    />
                    {active && <span uk-icon="icon: check; ratio: 0.7"></span>}
                    {dia}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button className="uk-button uk-button-primary" type="submit" disabled={loading} style={{ height: '36px' }}>
              {loading
                ? <><span uk-spinner="ratio: 0.5"></span> Criando...</>
                : <><span uk-icon="icon: check; ratio: 0.85"></span> Criar Comunidade</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChurchCreate;
