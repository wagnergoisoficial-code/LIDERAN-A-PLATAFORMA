import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import ChurchCreate from '../components/ChurchCreate';
import ChurchMembers from '../components/ChurchMembers';

interface Church {
  id: string;
  name: string;
  title?: string;
  description?: string;
  cultosDias?: string[];
  users?: any[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  useEffect(() => {
    loadChurches();
  }, []);

  const loadChurches = async () => {
    setLoading(true);
    try {
      const result = await api.getMyChurches();
      if (result.success) {
        setChurches(result.data || []);
        if (result.data && result.data.length > 0) {
          setSelectedChurch(result.data[0]);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar comunidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChurchCreated = () => {
    loadChurches();
    setShowCreateForm(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
      {/* SIDEBAR ESQUERDA */}
      <div style={{
        width: '240px',
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #e9ecef',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        overflowY: 'auto'
      }}>
        {/* Header do Sidebar */}
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#212529' }}>
            Painel do Líder
          </h3>
          <p style={{ margin: '0', fontSize: '13px', color: '#6c757d' }}>
            Gerencie suas comunidades
          </p>
        </div>

        {/* Botão Criar Comunidade */}
        <div style={{ padding: '0 12px', marginBottom: '20px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: showCreateForm ? '#0d6efd' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!showCreateForm) {
                e.currentTarget.style.backgroundColor = '#5a6268';
              }
            }}
            onMouseLeave={(e) => {
              if (!showCreateForm) {
                e.currentTarget.style.backgroundColor = '#6c757d';
              }
            }}
          >
            {showCreateForm ? '✕ Cancelar' : '+ Nova Comunidade'}
          </button>
        </div>

        {/* Divisor */}
        <div style={{ height: '1px', backgroundColor: '#e9ecef', margin: '12px 0' }}></div>

        {/* Lista de Comunidades */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
              <div uk-spinner="ratio: 0.8"></div>
            </div>
          ) : churches.length === 0 ? (
            <div style={{ padding: '20px', color: '#6c757d', fontSize: '13px', textAlign: 'center' }}>
              Nenhuma comunidade criada
            </div>
          ) : (
            churches.map((church: Church) => (
              <button
                key={church.id}
                onClick={() => setSelectedChurch(church)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: selectedChurch?.id === church.id ? '#0d6efd' : 'transparent',
                  color: selectedChurch?.id === church.id ? 'white' : '#212529',
                  border: 'none',
                  borderLeft: selectedChurch?.id === church.id ? '4px solid #0d6efd' : '4px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  if (selectedChurch?.id !== church.id) {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedChurch?.id !== church.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {church.name}
                </div>
                {church.users && (
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    👥 {church.users.length} membro{church.users.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL DIREITA */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: 'white' }}>
        {showCreateForm ? (
          <div>
            <h2 style={{ marginTop: '0', marginBottom: '24px', fontSize: '24px', fontWeight: '600' }}>
              Criar Nova Comunidade
            </h2>
            <div style={{ maxWidth: '600px' }}>
              <ChurchCreate onChurchCreated={handleChurchCreated} />
            </div>
          </div>
        ) : selectedChurch ? (
          <div>
            {/* HEADER COM INFO DA COMUNIDADE */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                    {selectedChurch.name}
                  </h2>
                  {selectedChurch.title && (
                    <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#6c757d' }}>
                      {selectedChurch.title}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowMembersModal(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#218838';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#28a745';
                  }}
                >
                  👥 Ver Membros
                </button>
              </div>
            </div>

            {/* GRID COM INFO E MEMBROS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* COLUNA ESQUERDA - INFO */}
              <div>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#212529' }}>
                    Informações da Comunidade
                  </h4>

                  {selectedChurch.description && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#6c757d' }}>
                        Descrição
                      </p>
                      <p style={{ margin: '0', fontSize: '14px', color: '#212529', lineHeight: '1.5' }}>
                        {selectedChurch.description}
                      </p>
                    </div>
                  )}

                  {selectedChurch.cultosDias && selectedChurch.cultosDias.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#6c757d' }}>
                        Dias de Culto
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedChurch.cultosDias.map((dia: string) => (
                          <span
                            key={dia}
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#0d6efd',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              textTransform: 'capitalize'
                            }}
                          >
                            {dia}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUNA DIREITA - MEMBROS */}
              <div>
                <ChurchMembers
                  churchId={selectedChurch.id}
                  churchName={selectedChurch.name}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '16px', margin: '0' }}>
              Selecione uma comunidade ou crie uma nova
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE MEMBROS */}
      {showMembersModal && selectedChurch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: '0', fontSize: '24px', fontWeight: '700', color: '#212529' }}>
                Membros de {selectedChurch.name}
              </h3>
              <button
                onClick={() => setShowMembersModal(false)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✕ Fechar
              </button>
            </div>
            <ChurchMembers
              churchId={selectedChurch.id}
              churchName={selectedChurch.name}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

