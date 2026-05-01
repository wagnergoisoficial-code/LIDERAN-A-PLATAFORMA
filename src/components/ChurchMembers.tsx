import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import UIkit from 'uikit';

interface ChurchMembersProps {
  churchId: string;
  churchName: string;
}

const ChurchMembers: React.FC<ChurchMembersProps> = ({ churchId, churchName }) => {
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [churchId]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    title: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await api.getChurchMembers(churchId);
      if (response.success) {
        setMembers(Array.isArray(response.data) ? response.data : response.data.users || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar membros:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      UIkit.notification({ 
        message: 'As senhas não conferem', 
        status: 'danger', 
        pos: 'top-right' 
      });
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      UIkit.notification({ 
        message: 'Nome e email são obrigatórios', 
        status: 'danger', 
        pos: 'top-right' 
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.registerMemberInChurch({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        churchId: churchId,
        age: formData.age ? parseInt(formData.age) : undefined,
        title: formData.title || undefined,
        location: formData.location || undefined,
      });

      if (response.success) {
        UIkit.notification({ 
          message: 'Membro cadastrado com sucesso!', 
          status: 'success', 
          pos: 'top-right' 
        });
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          age: '',
          title: '',
          location: '',
        });
        loadMembers();
        setShowForm(false);
      }
    } catch (err: any) {
      UIkit.notification({ 
        message: err.message || 'Erro ao cadastrar membro', 
        status: 'danger', 
        pos: 'top-right' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* HEADER COM BOTÃO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#212529' }}>
          Membros da Comunidade
        </h4>
        <button 
          style={{
            padding: '8px 16px',
            backgroundColor: showForm ? '#dc3545' : '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = showForm ? '#c82333' : '#0b5ed7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = showForm ? '#dc3545' : '#0d6efd';
          }}
          onClick={() => {
            setShowForm(!showForm);
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Novo Membro'}
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          maxWidth: '800px',
          margin: '0 auto 20px'
        }}>
          <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#212529' }}>
            Registrar Novo Membro
          </h5>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6c757d' }}>
                Nome *
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                type="text" 
                name="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6c757d' }}>
                Email *
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                type="email" 
                name="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6c757d' }}>
                Senha *
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                type="password" 
                name="password"
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={8}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6c757d' }}>
                Confirmar Senha *
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                type="password" 
                name="confirmPassword"
                placeholder="Confirme a senha"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={8}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6c757d' }}>
                Idade
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                type="number" 
                name="age"
                placeholder="Ex: 25"
                value={formData.age}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6c757d' }}>
                Título/Função
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                type="text" 
                name="title"
                placeholder="Ex: Diácono"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6c757d' }}>
              Localização
            </label>
            <input 
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
              type="text" 
              name="location"
              placeholder="Ex: São Paulo - SP"
              value={formData.location}
              onChange={handleInputChange}
            />
          </div>

          <button 
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#0d6efd',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#0b5ed7';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#0d6efd';
              }
            }}
            type="submit"
            disabled={loading}
          >
            {loading ? '...' : '✓ Cadastrar Membro'}
          </button>
        </form>
      )}

      {/* TABELA DE MEMBROS */}
      {!showForm && (
        <>
          {loadingMembers ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
              <div uk-spinner="ratio: 0.8"></div>
            </div>
          ) : members.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#6c757d' }}>Nome</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#6c757d' }}>Email</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#6c757d' }}>Função</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => (
                    <tr key={member.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px 8px', color: '#212529', fontWeight: '500' }}>
                        {member.name}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#6c757d' }}>
                        {member.email}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#6c757d' }}>
                        {member.title || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              padding: '48px 24px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <p style={{ fontSize: '16px', color: '#6c757d', margin: '0' }}>Nenhum membro cadastrado ainda</p>
              <p style={{ fontSize: '14px', color: '#adb5bd', margin: '8px 0 16px 0' }}>Clique em "+ Novo Membro" para adicionar o primeiro membro</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChurchMembers;
