export interface Assistant {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  api_url: string;
  model_name: string;
  system_prompt: string;
  capabilities: AssistantCapability[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistantCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const assistants: Assistant[] = [
  {
    id: "1",
    name: "narrative",
    display_name: "Narrative Coach",
    description: "Ein spezialisierter Assistent für Storytelling, Kommunikation und narrative Entwicklung.",
    icon: "📖",
    api_url: "https://api.assistant-os.com",
    model_name: "narrative-coach",
    system_prompt: "Du bist ein Narrative Assistant, der bei Storytelling, Kommunikation und narrativer Entwicklung hilft. Du unterstützt Unternehmen und Personen dabei, ihre Geschichten wirkungsvoll zu erzählen und zu kommunizieren.",
    capabilities: [
      {
        id: "1",
        name: "Storytelling",
        description: "Entwicklung von überzeugenden Geschichten",
        enabled: true
      },
      {
        id: "2", 
        name: "Kommunikation",
        description: "Optimierung der Kommunikationsstrategie",
        enabled: true
      }
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "2",
    name: "csrd",
    display_name: "CSRD Coach",
    description: "Experte für Corporate Sustainability Reporting Directive und nachhaltige Unternehmensführung.",
    icon: "🌱",
    api_url: "https://api.assistant-os.com",
    model_name: "csrd-coach",
    system_prompt: "Du bist ein CSRD-Experte, der Unternehmen bei der Umsetzung der Corporate Sustainability Reporting Directive unterstützt. Du hilfst bei Nachhaltigkeitsberichten, ESG-Compliance und nachhaltiger Unternehmensführung.",
    capabilities: [
      {
        id: "3",
        name: "CSRD Compliance",
        description: "Unterstützung bei CSRD-Anforderungen",
        enabled: true
      },
      {
        id: "4",
        name: "ESG Reporting",
        description: "ESG-Berichterstattung",
        enabled: true
      }
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "3",
    name: "adoption",
    display_name: "Adoption Coach",
    description: "Spezialist für Change Management und Technologie-Adoption in Unternehmen.",
    icon: "🚀",
    api_url: "https://api.assistant-os.com",
    model_name: "adoption-coach",
    system_prompt: "Du bist ein Change Management-Experte, der Unternehmen bei der Adoption neuer Technologien und Veränderungsprozessen unterstützt. Du hilfst bei der Planung und Umsetzung von Transformationsprojekten.",
    capabilities: [
      {
        id: "5",
        name: "Change Management",
        description: "Begleitung von Veränderungsprozessen",
        enabled: true
      },
      {
        id: "6",
        name: "Technology Adoption",
        description: "Unterstützung bei Technologie-Einführung",
        enabled: true
      }
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "4",
    name: "image",
    display_name: "Image Generator",
    description: "KI-Assistent für die Erstellung und Bearbeitung von Bildern und visuellen Inhalten.",
    icon: "🎨",
    api_url: "https://api.assistant-os.com",
    model_name: "image",
    system_prompt: "Du bist ein KI-Assistent für Bildgenerierung und visuelle Inhalte. Du hilfst bei der Erstellung, Bearbeitung und Optimierung von Bildern für verschiedene Anwendungszwecke.",
    capabilities: [
      {
        id: "7",
        name: "Image Generation",
        description: "Erstellung von Bildern aus Textbeschreibungen",
        enabled: true
      },
      {
        id: "8",
        name: "Image Editing",
        description: "Bearbeitung und Optimierung bestehender Bilder",
        enabled: true
      }
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]; 