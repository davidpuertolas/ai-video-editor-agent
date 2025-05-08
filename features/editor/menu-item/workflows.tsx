import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WandSparkles, Music, MessageSquareText, Paintbrush, Plus, Trash2, Play, Save, Move } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Tipos básicos
interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export const Workflows = () => {
  // Estado para workflows predefinidos
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: "workflow-1",
      name: "Edición Rápida",
      description: "Recorta y añade subtítulos",
      steps: [
        {
          id: "step-1",
          type: "smartTrim",
          name: "Recorte Inteligente",
          icon: <WandSparkles size={16} />,
          enabled: true,
        },
        {
          id: "step-2",
          type: "captions",
          name: "Subtítulos Automáticos",
          icon: <MessageSquareText size={16} />,
          enabled: true,
        }
      ]
    },
    {
      id: "workflow-2",
      name: "Video de Alta Calidad",
      description: "Edición completa con efectos",
      steps: [
        {
          id: "step-1",
          type: "smartTrim",
          name: "Recorte Inteligente",
          icon: <WandSparkles size={16} />,
          enabled: true,
        },
        {
          id: "step-2",
          type: "captions",
          name: "Subtítulos Automáticos",
          icon: <MessageSquareText size={16} />,
          enabled: true,
        },
        {
          id: "step-3",
          type: "music",
          name: "Música de Fondo",
          icon: <Music size={16} />,
          enabled: true,
        }
      ]
    }
  ]);

  // Estado para workflow seleccionado y nuevos workflows
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");

  // Función para crear un nuevo workflow
  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim() === "") return;

    const newWorkflow = {
      id: `workflow-${Date.now()}`,
      name: newWorkflowName,
      description: newWorkflowDescription,
      steps: []
    };

    setWorkflows([...workflows, newWorkflow]);
    setNewWorkflowName("");
    setNewWorkflowDescription("");
  };

  // Función para eliminar un workflow
  const handleDeleteWorkflow = (id: string) => {
    setWorkflows(workflows.filter(workflow => workflow.id !== id));
  };

  // Función para añadir un paso al workflow
  const handleAddStep = (type: string) => {
    if (!selectedWorkflow) return;

    const icons: Record<string, React.ReactNode> = {
      smartTrim: <WandSparkles size={16} />,
      captions: <MessageSquareText size={16} />,
      music: <Music size={16} />,
      colorGrading: <Paintbrush size={16} />
    };

    const names: Record<string, string> = {
      smartTrim: 'Recorte Inteligente',
      captions: 'Subtítulos Automáticos',
      music: 'Música de Fondo',
      colorGrading: 'Corrección de Color'
    };

    const newStep = {
      id: `step-${Date.now()}`,
      type,
      name: names[type] || 'Paso Personalizado',
      icon: icons[type] || <Plus size={16} />,
      enabled: true
    };

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: [...selectedWorkflow.steps, newStep]
    };

    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(wf =>
      wf.id === selectedWorkflow.id ? updatedWorkflow : wf
    ));
  };

  // Función para quitar un paso
  const handleRemoveStep = (stepId: string) => {
    if (!selectedWorkflow) return;

    const updatedSteps = selectedWorkflow.steps.filter(step => step.id !== stepId);
    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps
    };

    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(wf =>
      wf.id === selectedWorkflow.id ? updatedWorkflow : wf
    ));
  };

  // Función para activar/desactivar un paso
  const handleToggleStep = (stepId: string) => {
    if (!selectedWorkflow) return;

    const updatedSteps = selectedWorkflow.steps.map(step =>
      step.id === stepId ? {...step, enabled: !step.enabled} : step
    );

    setSelectedWorkflow({...selectedWorkflow, steps: updatedSteps});
    setWorkflows(workflows.map(wf =>
      wf.id === selectedWorkflow.id ? {...selectedWorkflow, steps: updatedSteps} : wf
    ));
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-between h-12 items-center px-4 text-sm font-medium">
        <div>Workflows de Edición</div>
        <Dialog>
          <Button variant="ghost" size="sm" className="flex items-center gap-1">
            <Plus size={16} /> Nuevo
          </Button>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear nuevo workflow</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nombre</Label>
                <Input
                  id="name"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="col-span-3"
                  placeholder="Mi workflow de edición"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Descripción</Label>
                <Input
                  id="description"
                  value={newWorkflowDescription}
                  onChange={(e) => setNewWorkflowDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Workflow para ediciones rápidas..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary">Cancelar</Button>
              <Button onClick={handleCreateWorkflow}>Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col p-2 gap-2">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="border border-border/30 rounded-md p-2 hover:border-purple-500/50 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-medium">{workflow.name}</h4>
                <div className="flex gap-1">
                  <Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <Play size={14} />
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aplicar workflow: {workflow.name}</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Pasos a aplicar:</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {workflow.steps.filter(s => s.enabled).map((step) => (
                              <div key={step.id} className="flex items-center gap-2 text-sm border border-border/20 p-2 rounded">
                                {step.icon} {step.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancelar</Button>
                        <Button>Aplicar Workflow</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="21" x2="4" y2="14" />
                        <line x1="4" y1="10" x2="4" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12" y2="3" />
                        <line x1="20" y1="21" x2="20" y2="16" />
                        <line x1="20" y1="12" x2="20" y2="3" />
                        <line x1="1" y1="14" x2="7" y2="14" />
                        <line x1="9" y1="8" x2="15" y2="8" />
                        <line x1="17" y1="16" x2="23" y2="16" />
                      </svg>
                    </Button>
                    <DialogContent className="sm:max-w-[525px]">
                      <DialogHeader>
                        <DialogTitle>Editar workflow: {selectedWorkflow?.name}</DialogTitle>
                      </DialogHeader>
                      {selectedWorkflow && (
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Nombre</Label>
                            <Input
                              id="edit-name"
                              value={selectedWorkflow.name}
                              onChange={(e) => setSelectedWorkflow({
                                ...selectedWorkflow,
                                name: e.target.value
                              })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Descripción</Label>
                            <Input
                              id="edit-description"
                              value={selectedWorkflow.description}
                              onChange={(e) => setSelectedWorkflow({
                                ...selectedWorkflow,
                                description: e.target.value
                              })}
                            />
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label>Pasos del Workflow</Label>
                              <Select onValueChange={handleAddStep}>
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="Añadir paso" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="smartTrim">Recorte Inteligente</SelectItem>
                                  <SelectItem value="captions">Subtítulos</SelectItem>
                                  <SelectItem value="music">Música</SelectItem>
                                  <SelectItem value="colorGrading">Corrección de Color</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              {selectedWorkflow.steps.map((step, index) => (
                                <div
                                  key={step.id}
                                  className={`flex items-center justify-between p-2 rounded-md border ${
                                    step.enabled ? 'border-purple-500/30 bg-purple-500/5' : 'border-border/30 opacity-70'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="cursor-grab text-gray-400 hover:text-gray-300">
                                      <Move size={14} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {step.icon}
                                      <span className="text-sm">{step.name}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={step.enabled}
                                      onCheckedChange={() => handleToggleStep(step.id)}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveStep(step.id)}
                                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {selectedWorkflow.steps.length === 0 && (
                                <div className="text-sm text-gray-400 text-center p-4 border border-dashed border-border/50 rounded-md">
                                  No hay pasos configurados. Añade uno usando el selector de arriba.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (selectedWorkflow) {
                              handleDeleteWorkflow(selectedWorkflow.id);
                            }
                          }}
                          className="mr-auto"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Eliminar
                        </Button>
                        <Button variant="outline">Cancelar</Button>
                        <Button onClick={() => {
                          if (selectedWorkflow) {
                            setWorkflows(workflows.map(workflow =>
                              workflow.id === selectedWorkflow.id ? selectedWorkflow : workflow
                            ));
                          }
                        }}>
                          <Save size={16} className="mr-2" />
                          Guardar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{workflow.description}</p>
              <div className="flex flex-wrap gap-1">
                {workflow.steps.map((step) => (
                  <Badge
                    key={step.id}
                    variant={step.enabled ? "default" : "outline"}
                    className={`text-xs ${!step.enabled && 'opacity-60'}`}
                  >
                    <span className="mr-1">{step.icon}</span> {step.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}

          {workflows.length === 0 && (
            <div className="text-center p-8 text-muted-foreground text-sm">
              <div className="mb-2">No hay workflows configurados</div>
              <div>Crea un nuevo workflow para automatizar tus tareas de edición</div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
