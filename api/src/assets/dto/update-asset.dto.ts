import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';

// Every field optional; the acquisition validation has its own endpoint
export class UpdateAssetDto extends PartialType(CreateAssetDto) { }
