import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Copy, Check, Trash2, Plus } from "lucide-react";

export function AdminInvitesManager() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState(1);

  // Queries & Mutations
  const { data: authorizedUsers, refetch: refetchUsers } = trpc.invites.listAuthorized.useQuery();
  const createInviteMutation = trpc.invites.create.useMutation();
  const revokeUserMutation = trpc.invites.revoke.useMutation();

  const handleCreateInvite = async () => {
    try {
      const result = await createInviteMutation.mutateAsync({ maxUses });
      const inviteUrl = `${window.location.origin}/invite/${result.token}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(inviteUrl);
      setCopiedToken(result.token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error("Erro ao gerar convite:", error);
    }
  };

  const handleRevokeUser = async (email: string) => {
    if (!confirm(`Tem certeza que deseja revogar o acesso de ${email}?`)) return;
    try {
      await revokeUserMutation.mutateAsync({ email });
      refetchUsers();
    } catch (error) {
      console.error("Erro ao revogar acesso:", error);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* Gerar Novo Convite */}
      <div className="border-b pb-6">
        <h2 className="text-lg font-semibold mb-4">Gerar Novo Convite</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Máximo de Usos</label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleCreateInvite}
            disabled={createInviteMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md flex items-center gap-2 transition"
          >
            <Plus size={18} />
            {createInviteMutation.isPending ? "Gerando..." : "Gerar Convite"}
          </button>
        </div>
      </div>

      {/* Usuários Autorizados */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Usuários Autorizados ({authorizedUsers?.length || 0})</h2>
        {authorizedUsers && authorizedUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">E-mail</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Autorizado em</th>
                  <th className="text-left py-2 px-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {authorizedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{user.email}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status === "active" ? "Ativo" : "Revogado"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2 px-3">
                      {user.status === "active" && (
                        <button
                          onClick={() => handleRevokeUser(user.email)}
                          disabled={revokeUserMutation.isPending}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-400 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Nenhum usuário autorizado ainda</p>
        )}
      </div>

      {/* Feedback */}
      {copiedToken && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2 text-green-800">
          <Check size={18} />
          <span>Link copiado para a área de transferência!</span>
        </div>
      )}
    </div>
  );
}
