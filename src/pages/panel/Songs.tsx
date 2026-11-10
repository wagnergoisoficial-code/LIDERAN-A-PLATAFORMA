import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import MoreMenu from '../../components/MoreMenu';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { EventFormModal } from '../../components/EventForm';

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

interface Song { id: string; title: string; artist?: string | null; musicKey?: string | null; link?: string | null; notes?: string | null }
const EMPTY = { title: '', artist: '', musicKey: '', link: '', notes: '' };

/** Regência: repertório (título, autor, tom, link e observações) e ensaios na agenda. */
const Songs = () => {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ id?: string; form: typeof EMPTY } | null>(null);
  const [rehearsal, setRehearsal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSongs().then(res => setSongs(res.data || [])).catch(() => { setSongs([]); notify('Não foi possível carregar o repertório'); });
  }, []);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditing(cur => cur && { ...cur, form: { ...cur.form, [key]: e.target.value } });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await api.saveSong(editing.form, editing.id);
      setSongs(list => {
        const rest = (list || []).filter(s => s.id !== res.data.id);
        return [...rest, res.data].sort((a, b) => a.title.localeCompare(b.title, 'pt'));
      });
      setEditing(null);
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (song: Song) => {
    if (!confirm(`Apagar "${song.title}" do repertório?`)) return;
    try {
      await api.deleteSong(song.id);
      setSongs(list => (list || []).filter(s => s.id !== song.id));
      notify('Música apagada', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível apagar');
    }
  };

  const q = query.trim().toLowerCase();
  const shown = (songs || []).filter(s => !q || `${s.title} ${s.artist || ''}`.toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Repertório" subtitle="As músicas do grupo, com o tom e o link para ensaiar."
        actions={<>
          <button type="button" className="uk-button uk-button-default" onClick={() => setRehearsal(true)}><Icon name="calendar" size={18} /> Marcar ensaio</button>
          <button type="button" className="uk-button uk-button-primary" onClick={() => setEditing({ form: { ...EMPTY } })}><Icon name="plus" size={18} /> Nova música</button>
        </>} />

      <div className="section-head" style={{ marginBottom: '10px' }}>
        <h2 className="list-label">Músicas{songs?.length ? ` · ${songs.length}` : ''}</h2>
        <input className="form-input" type="search" placeholder="Buscar música ou autor" aria-label="Buscar no repertório"
          value={query} onChange={e => setQuery(e.target.value)} style={{ width: '240px', maxWidth: '100%' }} />
      </div>

      {songs === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState icon="music" title={q ? 'Nenhuma música encontrada' : 'O repertório está vazio'} text={q ? undefined : 'Adicione as músicas que o grupo canta, com o tom de cada uma.'} /></div>
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr><th scope="col">Música</th><th scope="col">Tom</th><th scope="col">Link</th><th scope="col"><span className="visually-hidden">Ações</span></th></tr>
            </thead>
            <tbody>
              {shown.map(song => (
                <tr key={song.id}>
                  <td style={{ minWidth: '200px' }}>
                    <strong>{song.title}</strong>
                    {(song.artist || song.notes) && <span className="list-row-meta" style={{ display: 'block' }}>{[song.artist, song.notes].filter(Boolean).join(' · ')}</span>}
                  </td>
                  <td>{song.musicKey || <span className="muted">—</span>}</td>
                  <td>{song.link ? <a href={song.link} target="_blank" rel="noreferrer">Abrir</a> : <span className="muted">—</span>}</td>
                  <td style={{ textAlign: 'right' }}>
                    <MoreMenu label={`Opções de ${song.title}`} actions={[
                      { label: 'Editar', icon: 'pencil', onSelect: () => setEditing({ id: song.id, form: { ...EMPTY, ...Object.fromEntries(Object.entries(song).map(([k, v]) => [k, v ?? ''])) } as typeof EMPTY }) },
                      { label: 'Apagar', icon: 'trash', danger: true, onSelect: () => remove(song) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Editar música' : 'Nova música'} onClose={() => setEditing(null)} width={560} onSubmit={save}>
          <div className="form-grid">
            <div className="is-wide">
              <label className="form-label" htmlFor="song-title">Título</label>
              <input id="song-title" className="form-input" maxLength={120} required value={editing.form.title} onChange={set('title')} data-autofocus />
            </div>
            <div>
              <label className="form-label" htmlFor="song-artist">Autor <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <input id="song-artist" className="form-input" maxLength={120} value={editing.form.artist} onChange={set('artist')} />
            </div>
            <div>
              <label className="form-label" htmlFor="song-key">Tom <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <input id="song-key" className="form-input" maxLength={10} placeholder="Ex.: G, Dm" value={editing.form.musicKey} onChange={set('musicKey')} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="song-link">Link <span className="faint" style={{ fontWeight: 400 }}>(YouTube, cifra… opcional)</span></label>
              <input id="song-link" className="form-input" type="url" maxLength={500} placeholder="https://" value={editing.form.link} onChange={set('link')} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="song-notes">Observações <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <textarea id="song-notes" className="form-input" rows={3} maxLength={2000} value={editing.form.notes} onChange={set('notes')} />
            </div>
          </div>
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setEditing(null)}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </Modal>
      )}

      {rehearsal && (
        <EventFormModal onClose={() => setRehearsal(false)}
          onSaved={() => { setRehearsal(false); notify('Ensaio marcado: já aparece na agenda e no feed', 'success'); }} />
      )}
    </div>
  );
};

export default Songs;
