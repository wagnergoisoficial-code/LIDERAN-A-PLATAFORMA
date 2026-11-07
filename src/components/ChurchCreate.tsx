import React, { useState, useRef } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  onCancel?: () => void;
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const ChurchCreate: React.FC<ChurchCreateProps> = ({ church, onChurchCreated, onCancel }) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDay = (dia: string) => {
    setFormData(prev => ({
      ...prev,
      cultosDias: prev.cultosDias.includes(dia) ? prev.cultosDias.filter(d => d !== dia) : [...prev.cultosDias, dia],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      UIkit.notification({ message: 'Dê um nome à comunidade', status: 'danger', pos: 'top-right' });
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
      const response = isEditing ? await api.updateChurch(church!.id, payload) : await api.createChurch(payload);
      if (response.success) {
        // Ao criar, a nova comunidade passa a ser a ativa: a sessão é atualizada
        if (!isEditing) celebrate(submitRef.current);
        applySession(response.session);
        UIkit.notification({ message: isEditing ? 'Comunidade atualizada' : 'Comunidade criada', status: 'success', pos: 'top-right' });
        if (!isEditing) setFormData({ name: '', title: '', description: '', cultosDias: [] });
        onChurchCreated?.(response.data);
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível salvar a comunidade', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" style={{ padding: '20px' }} onSubmit={handleSubmit} aria-labelledby="church-form-title">
      <h2 id="church-form-title" className="list-label" style={{ fontSize: '17px', marginBottom: '16px' }}>
        {isEditing ? 'Editar comunidade' : 'Nova comunidade'}
      </h2>
      <div className="form-stack">
        <div>
          <label className="form-label" htmlFor="church-name">Nome da comunidade</label>
          <input id="church-name" className="form-input" type="text" name="name" placeholder="Ex.: Jovens Central" value={formData.name} onChange={handleInputChange} required />
        </div>
        <div>
          <label className="form-label" htmlFor="church-title">Igreja <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input id="church-title" className="form-input" type="text" name="title" placeholder="Ex.: Igreja Evangélica da Matola" value={formData.title} onChange={handleInputChange} />
        </div>
        <div>
          <label className="form-label" htmlFor="church-description">Descrição <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea id="church-description" className="form-input" name="description" placeholder="Quem são, a missão e o que fazem juntos" rows={3} value={formData.description} onChange={handleInputChange} />
        </div>
        <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
          <legend className="form-label">Dias de culto</legend>
          <div className="segmented">
            {WEEKDAYS.map(dia => (
              <button key={dia} type="button" aria-pressed={formData.cultosDias.includes(dia)} onClick={() => toggleDay(dia)}
                style={{ textTransform: 'capitalize' }}>
                {dia}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="form-btn-row">
        {onCancel && <button type="button" className="form-btn" onClick={onCancel}>Cancelar</button>}
        <button ref={submitRef} className="form-btn primary" type="submit" disabled={loading}>
          {loading ? <><span uk-spinner="ratio: 0.5"></span> Salvando…</> : isEditing ? 'Salvar' : 'Criar comunidade'}
        </button>
      </div>
    </form>
  );
};

export default ChurchCreate;
