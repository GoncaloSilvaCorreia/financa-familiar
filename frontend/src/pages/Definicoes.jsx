import { useState, useEffect } from 'react'
import { UserPlus, Trash2, X, Crown, User, Mail, Copy, Check } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">{titulo}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function Definicoes() {
  const { utilizador } = useAuth()
  const [agregado, setAgregado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalConvite, setModalConvite] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [conviteLink, setConviteLink] = useState(null)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [erro, setErro] = useState('')
  const [loadingConvite, setLoadingConvite] = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [aRemover, setARemover] = useState(null)

  const souAdmin = agregado?.membros?.find(m => m.id === utilizador?.id)?.papel === 'admin'

  async function carregar() {
    setLoading(true)
    try {
      const { data } = await api.get('/agregado')
      setAgregado(data)
      setNovoNome(data.nome)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function guardarNome() {
    try {
      await api.put('/agregado', { nome: novoNome })
      setEditandoNome(false)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  async function convidar(e) {
    e.preventDefault()
    setErro('')
    setLoadingConvite(true)
    try {
      const { data } = await api.post('/agregado/convidar', { email: emailConvite })
      setConviteLink(data.link)
      setEmailConvite('')
      carregar()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao convidar.')
    } finally {
      setLoadingConvite(false)
    }
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(conviteLink)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
  }

  async function cancelarConvite(id) {
    try {
      await api.delete(`/agregado/convites/${id}`)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  async function removerMembro(id) {
    try {
      await api.delete(`/agregado/membros/${id}`)
      setARemover(null)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Definições</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gere o teu agregado familiar</p>
      </div>

      {/* Card do agregado */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">O meu agregado</h2>
          {souAdmin && !editandoNome && (
            <button onClick={() => setEditandoNome(true)}
              className="text-xs text-blue-500 hover:underline">
              Editar nome
            </button>
          )}
        </div>

        {editandoNome ? (
          <div className="flex gap-2 mb-4">
            <input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={guardarNome}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Guardar
            </button>
            <button onClick={() => setEditandoNome(false)}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🏠</div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{agregado?.nome}</div>
              <div className="text-xs text-gray-400">{agregado?.membros?.length} membro{agregado?.membros?.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )}

        {/* Lista de membros */}
        <div className="flex flex-col gap-2">
          {agregado?.membros?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {m.avatar_iniciais || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800">{m.nome}</span>
                  {m.papel === 'admin' && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Crown size={10} /> Admin
                    </span>
                  )}
                  {m.id === utilizador?.id && (
                    <span className="text-xs text-gray-300">(tu)</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{m.email}</div>
              </div>
              {souAdmin && m.id !== utilizador?.id && (
                <button onClick={() => setARemover(m)}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Botão convidar */}
        {souAdmin && (
          <button onClick={() => { setModalConvite(true); setConviteLink(null); setErro('') }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-dashed border-gray-200 text-gray-400 rounded-xl hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition">
            <UserPlus size={15} /> Convidar membro
          </button>
        )}
      </div>

      {/* Convites pendentes */}
      {agregado?.convites_pendentes?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Convites pendentes</h2>
          <div className="flex flex-col gap-2">
            {agregado.convites_pendentes.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{c.email}</div>
                  <div className="text-xs text-gray-400">
                    Expira em {new Date(c.expira_em).toLocaleDateString('pt-PT')}
                  </div>
                </div>
                {souAdmin && (
                  <button onClick={() => cancelarConvite(c.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal convidar */}
      {modalConvite && (
        <Modal titulo="Convidar membro" onClose={() => { setModalConvite(false); setConviteLink(null) }}>
          {!conviteLink ? (
            <form onSubmit={convidar} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input
                  required type="email"
                  placeholder="email@exemplo.com"
                  value={emailConvite}
                  onChange={e => setEmailConvite(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-400">
                Será gerado um link de convite. Partilha-o com a pessoa para ela se juntar ao teu agregado.
              </p>
              {erro && <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setModalConvite(false)}
                  className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={loadingConvite}
                  className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition">
                  {loadingConvite ? 'A criar...' : 'Criar convite'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                <Check size={16} className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-emerald-700">Convite criado com sucesso!</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Link de convite</label>
                <div className="flex gap-2">
                  <input readOnly value={conviteLink}
                    className="flex-1 px-3 py-2.5 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-500 truncate" />
                  <button onClick={copiarLink}
                    className={`px-3 py-2 rounded-lg border text-sm transition flex items-center gap-1.5 ${
                      linkCopiado ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {linkCopiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Partilha este link com a pessoa. Tem validade de 7 dias.
              </p>
              <button onClick={() => { setModalConvite(false); setConviteLink(null) }}
                className="w-full py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                Fechar
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Modal remover membro */}
      {aRemover && (
        <Modal titulo="Remover membro" onClose={() => setARemover(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Tens a certeza que queres remover <strong>{aRemover.nome}</strong> do agregado?
            Os dados registados por esta pessoa continuam visíveis.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setARemover(null)}
              className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={() => removerMembro(aRemover.id)}
              className="flex-1 py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition">
              Remover
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}