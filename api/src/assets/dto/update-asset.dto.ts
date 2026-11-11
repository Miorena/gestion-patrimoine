import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';

// Tous les champs sont optionnels ; la validation de l'acquisition a son propre endpoint
export class UpdateAssetDto extends PartialType(CreateAssetDto) { }
