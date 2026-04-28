import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

interface Devotional {
  id: string;
  title: string;
  content: string;
  verse: string;
  createdAt: string;
}

const Devotionals = () => {
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDevotionals();
  }, []);

  const loadDevotionals = async () => {
    try {
      const result = await api.getDevotionals();
      if (result.success) {
        setDevotionals(result.data);
      }
    } catch (err) {
      UIkit.notification({ message: 'Erro ao carregar devocionais', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const isLeaderOrAdmin = user?.role === 'leader' || user?.role === 'admin';

  return (
    <div>
      <div className="uk-grid-medium uk-flex-middle uk-margin-bottom" uk-grid="">
        <div className="uk-width-expand">
          <h2 className="uk-text-bold">Devocionais Diários</h2>
          <p className="uk-text-muted">Fortaleça sua fé com reflexões preparadas pelos líderes.</p>
        </div>
        {isLeaderOrAdmin && (
          <div className="uk-width-auto">
            <button 
              className="uk-button uk-button-primary uk-border-rounded" 
              uk-toggle="target: #modal-create-devotional"
            >
              <span uk-icon="plus" className="uk-margin-small-right"></span>
              Novo Devocional
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="uk-text-center uk-margin-large-top">
          <span uk-spinner="ratio: 2"></span>
        </div>
      ) : devotionals.length === 0 ? (
        <div className="uk-card uk-card-default uk-card-body uk-text-center">
          <span uk-icon="icon: bookmark; ratio: 2" className="uk-text-muted"></span>
          <p className="uk-text-muted uk-margin-top">Ainda não há devocionais cadastrados.</p>
        </div>
      ) : (
        <div className="uk-grid uk-grid-medium" uk-grid="masonry: true">
          {devotionals.map((dev) => (
            <div key={dev.id} className="uk-width-1-2@m">
              <div className="uk-card uk-card-default uk-card-body">
                <div className="uk-flex uk-flex-between uk-flex-middle">
                   <h3 className="uk-card-title uk-text-bold uk-margin-remove">{dev.title}</h3>
                   <span className="uk-label uk-label-success uk-border-rounded">Novo</span>
                </div>
                <p className="uk-text-meta uk-margin-small-top">
                   {new Date(dev.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <blockquote className="uk-margin-medium-top" style={{ borderLeft: '3px solid #1e87f0', paddingLeft: '15px' }}>
                  <p className="uk-text-italic">{dev.verse}</p>
                </blockquote>
                <p className="uk-margin-medium-top uk-text-justify">{dev.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal create devotional */}
      <CreateDevotionalModal onCreated={loadDevotionals} />
    </div>
  );
};

const CreateDevotionalModal = ({ onCreated }: { onCreated: () => void }) => {
  const [title, setTitle] = useState('');
  const [verse, setVerse] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.createDevotional({ title, verse, content });
      if (result.success) {
        setTitle('');
        setVerse('');
        setContent('');
        UIkit.modal('#modal-create-devotional').hide();
        onCreated();
        UIkit.notification({ message: 'Devocional criado!', status: 'success' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao criar devocional', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="modal-create-devotional" uk-modal="">
      <div className="uk-modal-dialog uk-modal-body uk-border-rounded">
        <button className="uk-modal-close-default" type="button" uk-close=""></button>
        <h2 className="uk-modal-title uk-text-bold">Novo Devocional</h2>
        <form className="uk-form-stacked uk-margin-medium-top" onSubmit={handleSubmit}>
          <div className="uk-margin">
            <label className="uk-form-label">Título</label>
            <input 
              className="uk-input" 
              type="text" 
              placeholder="Ex: Fé em Ação" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required 
            />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Versículo Chave</label>
            <input 
              className="uk-input" 
              type="text" 
              placeholder="Ex: João 3:16" 
              value={verse}
              onChange={(e) => setVerse(e.target.value)}
              required 
            />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Mensagem</label>
            <textarea 
              className="uk-textarea" 
              rows={6} 
              placeholder="Escreva a reflexão de hoje..." 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="uk-modal-footer uk-text-right uk-padding-remove-bottom">
            <button className="uk-button uk-button-default uk-modal-close uk-border-rounded uk-margin-small-right" type="button">Cancelar</button>
            <button className="uk-button uk-button-primary uk-border-rounded" type="submit" disabled={loading}>
              {loading ? <span uk-spinner="ratio: 0.6"></span> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Devotionals;
