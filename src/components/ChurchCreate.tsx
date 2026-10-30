import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import { celebrate } from '../lib/motion';

interface ChurchFormValues {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  cultosDias?: string[];
}

interface ChurchCreateProps {
  church?: ChurchFormValues; // presente = edição
  onChurchCreated?: (church?: { id: string }) => void;
}

const ChurchCreate: React.FC<ChurchCreateProps> = ({ church, onChurchCreated }) => {
  const { applySession } = useAuth();
  const isEditing = !!church;
  const [formData, setFormData] = useState({
    name: church?.name || '',
    title: church?.title || '',
    description: church?.description || '',
    cultosDias: church?.cultosDias || [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
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
      const payload = {
        name: formData.name,
        title: formData.title || null,
        description: formData.description || null,
        cultosDias: formData.cultosDias,
      };
      const response = isEditing
        ? await api.updateChurch(church!.id, payload)
        : await api.createChurch(payload);
      if (response.success) {
        // Ao criar, a nova comunidade passa a ser a ativa: a sessão é atualizada
        if (!isEditing) celebrate(submitRef.current);
        applySession(response.session);
        UIkit.notification({ message: isEditing ? 'Comunidade atualizada!' : 'Comunidade criada com sucesso!', status: 'success', pos: 'top-right' });
        if (!isEditing) setFormData({ name: '', title: '', description: '', cultosDias: [] });
        onChurchCreated?.(response.data);
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao salvar comunidade', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{isEditing ? 'Editar Comunidade' : 'Nova Comunidade'}</span>
      </div>

      <div className="card-body">
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
                    className="press"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 12px',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: active ? 'var(--accent)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px', fontWeight: 500,
                      color: active ? '#fff' : 'var(--text-muted)',
                      transition: 'background 160ms var(--ease-out), border-color 160ms var(--ease-out), color 160ms var(--ease-out), transform 420ms var(--spring-soft)',
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
            <button ref={submitRef} className="uk-button uk-button-primary" type="submit" disabled={loading} style={{ height: '36px' }}>
              {loading
                ? <><span uk-spinner="ratio: 0.5"></span> Salvando...</>
                : <><span uk-icon="icon: check; ratio: 0.85"></span> {isEditing ? 'Salvar Alterações' : 'Criar Comunidade'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChurchCreate;
