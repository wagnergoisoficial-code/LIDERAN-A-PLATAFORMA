import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import UIkit from 'uikit';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await api.getUsers();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (err) {
      UIkit.notification({ message: 'Erro ao carregar usuários', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'uk-label-danger';
      case 'leader': return 'uk-label-warning';
      default: return 'uk-label-info';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'leader': return 'Líder';
      default: return 'Membro';
    }
  };

  return (
    <div>
      <div className="uk-margin-bottom">
        <h2 className="uk-text-bold">Membros da Igreja</h2>
        <p className="uk-text-muted">Conheça os irmãos que fazem parte desta comunidade.</p>
      </div>

      {loading ? (
        <div className="uk-text-center uk-margin-large-top">
          <span uk-spinner="ratio: 2"></span>
        </div>
      ) : (
        <div className="uk-card uk-card-default uk-overflow-auto">
          <table className="uk-table uk-table-hover uk-table-divider uk-table-middle">
            <thead>
              <tr>
                <th className="uk-table-shrink">Avatar</th>
                <th className="uk-table-expand">Nome</th>
                <th>E-mail</th>
                <th>Cargo</th>
                <th className="uk-text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="uk-icon-button" uk-icon="user"></span>
                  </td>
                  <td className="uk-text-bold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`uk-label uk-border-rounded ${getRoleBadge(u.role)}`}>
                      {getRoleName(u.role)}
                    </span>
                  </td>
                  <td className="uk-text-right">
                    <Link to={`/profile/${u.id}`} className="uk-button uk-button-text uk-text-primary" uk-tooltip="Ver perfil">
                      <span uk-icon="search"></span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;
