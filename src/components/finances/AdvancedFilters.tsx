import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction } from "@/types/finances";

interface AdvancedFiltersProps {
  transactions: Transaction[];
  onFilterChange: (filtered: Transaction[]) => void;
  categories: string[];
}

export const AdvancedFilters = ({ transactions, onFilterChange, categories }: AdvancedFiltersProps) => {
  const [filters, setFilters] = useState({
    category: "",
    type: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState("");

  // Extrair todas as tags únicas das transações
  const allTags = Array.from(
    new Set(
      transactions
        .flatMap((t) => (t as any).tags || [])
        .filter(Boolean)
    )
  );

  const handleAddTag = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      const newFilters = {
        ...filters,
        tags: [...filters.tags, tagInput.trim()],
      };
      setFilters(newFilters);
      setTagInput("");
      applyFilters(newFilters);
    }
  };

  const handleRemoveTag = (tag: string) => {
    const newFilters = {
      ...filters,
      tags: filters.tags.filter((t) => t !== tag),
    };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (currentFilters = filters) => {
    let filtered = [...transactions];

    if (currentFilters.category) {
      filtered = filtered.filter((t) => t.category === currentFilters.category);
    }

    if (currentFilters.type) {
      filtered = filtered.filter((t) => t.type === currentFilters.type);
    }

    if (currentFilters.minAmount) {
      filtered = filtered.filter((t) => Number(t.amount) >= Number(currentFilters.minAmount));
    }

    if (currentFilters.maxAmount) {
      filtered = filtered.filter((t) => Number(t.amount) <= Number(currentFilters.maxAmount));
    }

    if (currentFilters.startDate) {
      filtered = filtered.filter((t) => t.transaction_date >= currentFilters.startDate);
    }

    if (currentFilters.endDate) {
      filtered = filtered.filter((t) => t.transaction_date <= currentFilters.endDate);
    }

    if (currentFilters.tags.length > 0) {
      filtered = filtered.filter((t) => {
        const transactionTags = (t as any).tags || [];
        return currentFilters.tags.some((tag) => transactionTags.includes(tag));
      });
    }

    onFilterChange(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      category: "",
      type: "",
      minAmount: "",
      maxAmount: "",
      startDate: "",
      endDate: "",
      tags: [],
    };
    setFilters(emptyFilters);
    onFilterChange(transactions);
  };

  const hasActiveFilters =
    filters.category ||
    filters.type ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.startDate ||
    filters.endDate ||
    filters.tags.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(value) => handleFilterChange("category", value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={filters.type || "all"}
              onValueChange={(value) => handleFilterChange("type", value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor Mínimo</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange("minAmount", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Máximo</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
            />
            <Button onClick={handleAddTag}>Adicionar</Button>
          </div>
          
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Tags disponíveis:</span>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => {
                    if (!filters.tags.includes(tag)) {
                      const newFilters = {
                        ...filters,
                        tags: [...filters.tags, tag],
                      };
                      setFilters(newFilters);
                      applyFilters(newFilters);
                    }
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {filters.tags.map((tag) => (
                <Badge key={tag} className="flex items-center gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
